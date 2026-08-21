'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/services/api';
import type { Session } from '@supabase/supabase-js';
import type { User as ProfileUser } from '@/lib/types';
import { isOnboardingRequired, writeOnboardingComplete } from '@/lib/onboarding';
import { trackEvent } from '@/utils/analytics';
import { isTempleEmail, microsoftCallbackUrl, sanitizeNextPath } from '@/lib/authHelpers';
import { detectInAppBrowser } from '@/lib/inAppBrowser';

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  isHost: boolean;
  createdAt: string;
  schoolYear: string | null;
  greekLife: string | null;
  instagram: string | null;
  avatarUrl: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  /** @deprecated Prefer needsOnboarding — kept for transitional callers. */
  needsUsername: boolean;
  requestOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMicrosoft: (
    nextPath?: string,
    options?: { selectAccount?: boolean }
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (
    fields: Parameters<typeof authApi.updateProfile>[0]
  ) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  uploadAvatar: (blob: Blob) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type ApiError = Error & { status?: number };
type AuthState = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  /**
   * True only when `user` came from a real GET /profiles/me response.
   * When the profile fetch fails we fall back to a blank session stub so the
   * UI stays signed in — but that stub must never be mistaken for a real
   * profile: during the 2026-08-18 backend outage it made finished accounts
   * look brand-new and funneled the owner through onboarding five times.
   * Anything that gates on profile fields (onboarding!) must check this flag.
   */
  profileLoaded: boolean;
};

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH'; session: Session; user: AuthUser; profileLoaded: boolean }
  | { type: 'CLEAR_AUTH'; keepLoading?: boolean }
  | { type: 'FINISH_LOADING' }
  | { type: 'REFRESH_SESSION'; session: Session };

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  profileLoaded: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true };
    case 'SET_AUTH':
      return {
        ...state,
        session: action.session,
        user: action.user,
        isLoading: false,
        profileLoaded: action.profileLoaded,
      };
    case 'CLEAR_AUTH':
      return {
        user: null,
        session: null,
        isLoading: action.keepLoading ?? false,
        profileLoaded: false,
      };
    case 'FINISH_LOADING':
      return { ...state, isLoading: false };
    case 'REFRESH_SESSION':
      return { ...state, session: action.session };
    default:
      return state;
  }
}

function profileToAuthUser(profile: ProfileUser): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    isAdmin: profile.is_admin,
    isHost: !!profile.is_host,
    createdAt: profile.created_at,
    schoolYear: profile.school_year ?? null,
    greekLife: profile.greek_life ?? null,
    instagram: profile.instagram ?? null,
    avatarUrl: profile.avatar_url ?? null,
  };
}

function authUserToProfile(user: AuthUser): ProfileUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    is_admin: user.isAdmin,
    is_host: user.isHost,
    created_at: user.createdAt,
    school_year: user.schoolYear,
    greek_life: user.greekLife,
    instagram: user.instagram,
    avatar_url: user.avatarUrl,
  };
}

function sessionToAuthUser(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email || '',
    username: null,
    isAdmin: false,
    isHost: false,
    createdAt: new Date().toISOString(),
    schoolYear: null,
    greekLife: null,
    instagram: null,
    avatarUrl: null,
  };
}

function rememberCompletedOnboarding(user: AuthUser) {
  if (user.username && user.schoolYear) {
    writeOnboardingComplete(user.id);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

// Retry schedule for a failed profile fetch. Short first gap so a Railway
// cold start heals fast; capped attempts so a real outage doesn't hammer.
const PROFILE_RETRY_DELAYS_MS = [2000, 5000, 15000];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, session, isLoading, profileLoaded }, dispatch] = useReducer(
    authReducer,
    initialState
  );
  const requestIdRef = useRef(0);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;
  const profileLoadedRef = useRef(false);
  profileLoadedRef.current = profileLoaded;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncAuthState = useCallback(async (nextSession: Session | null, attempt = 0) => {
    const requestId = ++requestIdRef.current;
    // A fresh sync supersedes any retry queued by an older failure.
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!nextSession) {
      dispatch({ type: 'CLEAR_AUTH' });
      return;
    }

    try {
      const profile = await withTimeout(
        authApi.getMe(),
        10000,
        'Timed out while loading account'
      );
      if (requestId !== requestIdRef.current) return;

      const nextUser = profileToAuthUser(profile);
      rememberCompletedOnboarding(nextUser);
      try {
        const posthog = (await import('posthog-js')).default;
        posthog.identify(nextUser.id, {
          email: nextUser.email,
          username: nextUser.username,
        });
      } catch {
        // analytics must never break auth
      }

      dispatch({
        type: 'SET_AUTH',
        session: nextSession,
        user: nextUser,
        profileLoaded: true,
      });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        // The backend now answers 401 ONLY when Supabase itself rejected the
        // token (infra trouble is 503), so signing out here is safe — this is
        // a genuinely dead session, not a hiccup.
        await supabase.auth.signOut();
        if (requestId !== requestIdRef.current) return;
        dispatch({ type: 'CLEAR_AUTH' });
        return;
      }

      if (requestId !== requestIdRef.current) return;
      // Keep the profile we already have. Replacing it with a blank session
      // stub (null username / school year) made finished accounts look new
      // and RequireOnboarding sent them through the flow again.
      const existing = userRef.current;
      const reusingLoadedProfile =
        !!existing && existing.id === nextSession.user.id && profileLoadedRef.current;
      const fallback =
        existing && existing.id === nextSession.user.id
          ? existing
          : sessionToAuthUser(nextSession);
      dispatch({
        type: 'SET_AUTH',
        session: nextSession,
        user: fallback,
        // Only counts as "loaded" if we're reusing a profile that really came
        // from the server earlier — a fresh stub is explicitly not loaded.
        profileLoaded: reusingLoadedProfile,
      });

      // 503 / network / timeout: the profile exists, we just couldn't get it.
      // Retry quietly in the background instead of leaving a nameless user.
      const delay = PROFILE_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) {
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          // Skip if a newer sync (login/logout/refresh) happened meanwhile.
          if (requestId === requestIdRef.current) {
            void syncAuthState(nextSession, attempt + 1);
          }
        }, delay);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: 'START_LOADING' });
      try {
        const {
          data: { session: activeSession },
        } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Timed out while checking auth session'
        );
        await syncAuthState(activeSession);
      } catch {
        dispatch({ type: 'CLEAR_AUTH' });
      } finally {
        dispatch({ type: 'FINISH_LOADING' });
      }
    };

    void initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, activeSession) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'CLEAR_AUTH' });
        return;
      }

      // Token rotation isn't a profile change — refetching /profiles/me here
      // raced with getSession() and a timeout looked like "never onboarded".
      if (event === 'TOKEN_REFRESHED') {
        if (activeSession) dispatch({ type: 'REFRESH_SESSION', session: activeSession });
        return;
      }

      // initAuth already loaded the session; don't double-fetch on subscribe.
      if (event === 'INITIAL_SESSION') return;

      await syncAuthState(activeSession);
    });

    return () => {
      subscription.unsubscribe();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [syncAuthState]);

  const signInWithMicrosoft = useCallback(
    async (
      nextPath?: string,
      options?: { selectAccount?: boolean }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // Instagram's WebView swallows the Azure redirect. Starting OAuth
        // here is what produced 2.4 Sign In taps per person on relaunch day.
        const inApp = detectInAppBrowser(navigator.userAgent);
        if (inApp.inApp) {
          const browser = inApp.platform === 'android' ? 'Chrome' : 'Safari';
          return {
            success: false,
            error: `Open this page in ${browser} to finish Microsoft sign-in.`,
          };
        }
        trackEvent('signup_started', { method: 'azure' });
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'azure',
          options: {
            scopes: 'email',
            redirectTo: microsoftCallbackUrl(window.location.origin, sanitizeNextPath(nextPath)),
            queryParams: {
              domain_hint: 'temple.edu',
              // By default Microsoft silently reuses whoever is already signed
              // in on this browser — great on your own phone, wrong on a
              // friend's computer. `prompt: 'select_account'` forces the
              // account picker (one-tap tiles + "Use another account"), so the
              // "Use a different account" link can rescue shared-computer
              // logins without adding friction to the normal path.
              ...(options?.selectAccount ? { prompt: 'select_account' } : {}),
            },
          },
        });
        if (error) throw error;
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Microsoft sign-in failed';
        return { success: false, error: message };
      }
    },
    []
  );

  const requestOtp = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = email.trim().toLowerCase();
    if (!isTempleEmail(normalized)) {
      return { success: false, error: 'Please use your Temple.edu email' };
    }

    try {
      trackEvent('signup_started', { method: 'email_otp' });
      await authApi.requestOtp(normalized);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification code';
      return { success: false, error: message };
    }
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string): Promise<{ success: boolean; error?: string }> => {
      const normalized = email.trim().toLowerCase();
      const cleanedCode = code.trim();

      try {
        trackEvent('code_entered');
        const otpSession = await authApi.verifyOtp(normalized, cleanedCode);
        const { error: setErr } = await supabase.auth.setSession({
          access_token: otpSession.access_token,
          refresh_token: otpSession.refresh_token,
        });
        if (setErr) throw setErr;

        trackEvent('login', { method: 'email_otp' });
        // onAuthStateChange will sync profile; force a sync for immediate UX.
        const {
          data: { session: active },
        } = await supabase.auth.getSession();
        await syncAuthState(active);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid or expired code';
        return { success: false, error: message };
      }
    },
    [syncAuthState]
  );

  const updateProfile = useCallback(
    async (
      fields: Parameters<typeof authApi.updateProfile>[0]
    ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      try {
        const profile = await authApi.updateProfile(fields);
        const nextUser = profileToAuthUser(profile);
        rememberCompletedOnboarding(nextUser);
        if (session) {
          // The server just returned the saved profile — that's a real load.
          dispatch({ type: 'SET_AUTH', session, user: nextUser, profileLoaded: true });
        }
        return { success: true, user: nextUser };
      } catch (err) {
        // Safari reports a failed CORS preflight as AbortError ("The
        // operation was aborted") — retry once after a beat.
        if (err instanceof Error && err.name === 'AbortError') {
          try {
            const profile = await authApi.updateProfile(fields);
            const nextUser = profileToAuthUser(profile);
            rememberCompletedOnboarding(nextUser);
            if (session) {
              dispatch({ type: 'SET_AUTH', session, user: nextUser, profileLoaded: true });
            }
            return { success: true, user: nextUser };
          } catch (retryErr) {
            return {
              success: false,
              error:
                retryErr instanceof Error ? retryErr.message : 'Failed to update profile',
            };
          }
        }
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update profile',
        };
      }
    },
    [session]
  );

  const uploadAvatar = useCallback(
    async (blob: Blob): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
      try {
        const profile = await authApi.uploadAvatar(blob);
        const nextUser = profileToAuthUser(profile);
        if (session) {
          // The server just returned the saved profile — that's a real load.
          dispatch({ type: 'SET_AUTH', session, user: nextUser, profileLoaded: true });
        }
        return { success: true, user: nextUser };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to upload avatar',
        };
      }
    },
    [session]
  );

  const logout = useCallback(async () => {
    trackEvent('logout');
    await supabase.auth.signOut();
    try {
      const posthog = (await import('posthog-js')).default;
      posthog.reset();
    } catch {
      // ignore
    }
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (session) {
      await syncAuthState(session);
    }
  }, [session, syncAuthState]);

  // Gate on profileLoaded: a fallback stub (profile fetch failed) must never
  // send an already-onboarded account back through /onboarding. Unknown
  // profile ≠ incomplete profile — the background retry will settle it.
  const onboardingIncomplete =
    profileLoaded && isOnboardingRequired(user ? authUserToProfile(user) : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!session && !!user,
        isLoading,
        needsOnboarding: onboardingIncomplete,
        needsUsername: onboardingIncomplete,
        requestOtp,
        verifyOtp,
        signInWithMicrosoft,
        updateProfile,
        uploadAvatar,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
