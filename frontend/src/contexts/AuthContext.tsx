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
import { needsOnboarding } from '@/lib/onboarding';
import { trackEvent } from '@/utils/analytics';
import { isTempleEmail, microsoftCallbackUrl, sanitizeNextPath } from '@/lib/authHelpers';

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
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
};

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH'; session: Session; user: AuthUser }
  | { type: 'CLEAR_AUTH'; keepLoading?: boolean }
  | { type: 'FINISH_LOADING' };

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
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
      };
    case 'CLEAR_AUTH':
      return {
        user: null,
        session: null,
        isLoading: action.keepLoading ?? false,
      };
    case 'FINISH_LOADING':
      return { ...state, isLoading: false };
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
    createdAt: new Date().toISOString(),
    schoolYear: null,
    greekLife: null,
    instagram: null,
    avatarUrl: null,
  };
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, session, isLoading }, dispatch] = useReducer(authReducer, initialState);
  const requestIdRef = useRef(0);

  const syncAuthState = useCallback(async (nextSession: Session | null) => {
    const requestId = ++requestIdRef.current;

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
      });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        await supabase.auth.signOut();
        if (requestId !== requestIdRef.current) return;
        dispatch({ type: 'CLEAR_AUTH' });
        return;
      }

      if (requestId !== requestIdRef.current) return;
      // Profile fetch failed (network etc.) — keep session, treat as incomplete onboarding.
      dispatch({
        type: 'SET_AUTH',
        session: nextSession,
        user: sessionToAuthUser(nextSession),
      });
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

      await syncAuthState(activeSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncAuthState]);

  const signInWithMicrosoft = useCallback(
    async (
      nextPath?: string,
      options?: { selectAccount?: boolean }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
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
        if (session) {
          dispatch({ type: 'SET_AUTH', session, user: nextUser });
        }
        return { success: true, user: nextUser };
      } catch (err) {
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
          dispatch({ type: 'SET_AUTH', session, user: nextUser });
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

  const onboardingIncomplete = needsOnboarding(user ? authUserToProfile(user) : null);

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
