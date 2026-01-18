'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '@/services/api';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsUsername, setNeedsUsername] = useState(false);

  // Fetch user profile from our backend
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          username: profile.username,
          isAdmin: profile.is_admin,
          createdAt: profile.created_at,
        });
        setNeedsUsername(!profile.username);
      } else {
        // User exists in Supabase Auth but not in our user_profiles table yet
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: null,
            isAdmin: false,
            createdAt: new Date().toISOString(),
          });
          setNeedsUsername(true);
        }
      }
    } catch (error) {
      // If API call fails (e.g., 401), check if we have a session and need username
      console.error('Failed to fetch user profile:', error);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: null,
          isAdmin: false,
          createdAt: new Date().toISOString(),
        });
        setNeedsUsername(true);
      }
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);

        if (session) {
          await fetchUserProfile();
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);
      setSession(session);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
        await fetchUserProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setNeedsUsername(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const sendMagicLink = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    // Validate email format
    if (!email.toLowerCase().endsWith('@temple.edu')) {
      return { success: false, error: 'Please use your Temple.edu email' };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to send magic link' };
    }
  }, []);

  const setUsernameHandler = useCallback(async (username: string): Promise<{ success: boolean; error?: string }> => {
    if (username.length < 2) {
      return { success: false, error: 'Username must be at least 2 characters' };
    }

    try {
      await authApi.setUsername(username);
      await fetchUserProfile();
      setNeedsUsername(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to set username' };
    }
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setNeedsUsername(false);
  }, []);

  const refreshUser = useCallback(async () => {
    if (session) {
      await fetchUserProfile();
    }
  }, [session, fetchUserProfile]);

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
