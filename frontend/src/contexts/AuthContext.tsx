'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/services/api';
import type { Session } from '@supabase/supabase-js';
import posthog from 'posthog-js';

interface User {
  id: string;
  email: string;
  username: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsUsername: boolean;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  setUsername: (username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

type ApiError = Error & { status?: number };
type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  needsUsername: boolean;
};

type AuthAction =
  | { type: 'START_LOADING' }
  | { type: 'SET_AUTH'; session: Session; user: User; needsUsername: boolean }
  | { type: 'CLEAR_AUTH'; keepLoading?: boolean }
  | { type: 'FINISH_LOADING' };

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  needsUsername: false,
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
        needsUsername: action.needsUsername,
        isLoading: false,
      };
    case 'CLEAR_AUTH':
      return {
        user: null,
        session: null,
        needsUsername: false,
        isLoading: action.keepLoading ?? false,
      };
    case 'FINISH_LOADING':
      return { ...state, isLoading: false };
    default:
      return state;
  }
}

function profileToUser(profile: {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at: string;
}): User {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    isAdmin: profile.is_admin,
    createdAt: profile.created_at,
  };
}

function sessionToUser(session: Session): User {
  return {
    id: session.user.id,
    email: session.user.email || '',
    username: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
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
  const [{ user, session, isLoading, needsUsername }, dispatch] = useReducer(authReducer, initialState);
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

      const user = profileToUser(profile);
      posthog.identify(user.id, {
        email: user.email,
        username: user.username,
      });
      dispatch({
        type: 'SET_AUTH',
        session: nextSession,
        user,
        needsUsername: !profile.username,
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        await supabase.auth.signOut();
        if (requestId !== requestIdRef.current) return;
        dispatch({ type: 'CLEAR_AUTH' });
        return;
      }

      if (requestId !== requestIdRef.current) return;
      dispatch({
        type: 'SET_AUTH',
        session: nextSession,
        user: sessionToUser(nextSession),
        // If we can't load the profile, default to requiring username so the user
        // sees a deterministic next step instead of a blank profile.
        needsUsername: true,
      });
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      dispatch({ type: 'START_LOADING' });
      try {
        const { data: { session: activeSession } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Timed out while checking auth session'
        );
        await syncAuthState(activeSession);
      } catch (error) {
        console.error('Auth init error:', error);
        dispatch({ type: 'CLEAR_AUTH' });
      } finally {
        dispatch({ type: 'FINISH_LOADING' });
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, activeSession) => {
      console.log('Auth event:', event, 'Session:', !!activeSession);

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

  // Epic 3: OTP request is proxied through the backend (@temple.edu enforced server-side).
  // Full code-entry UI lands in Epic 6; this keeps the request path on the new API.
  const sendMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!email.toLowerCase().endsWith('@temple.edu')) {
      return { success: false, error: 'Please use your Temple.edu email' };
    }

    try {
      posthog.capture('login_started', { method: 'email_otp' });
      await authApi.requestOtp(email.toLowerCase());
      posthog.capture('otp_requested');
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification code';
      posthog.capture('login_failed', { error: message });
      return { success: false, error: message };
    }
  }, []);

  const setUsernameHandler = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (username.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters' };
    }

    try {
      await authApi.setUsername(username);
      if (session) {
        await syncAuthState(session);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to set username' };
    }
  }, [session, syncAuthState]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    posthog.reset();
    dispatch({ type: 'CLEAR_AUTH' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (session) {
      await syncAuthState(session);
    }
  }, [session, syncAuthState]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!session && !!user,
        isLoading,
        needsUsername,
        sendMagicLink,
        setUsername: setUsernameHandler,
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
