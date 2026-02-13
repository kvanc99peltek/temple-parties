'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const hasRedirected = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleRedirect = () => {
      if (isMounted && !hasRedirected.current) {
        hasRedirected.current = true;
        console.log('[Auth Callback] Session detected, redirecting...');
        router.replace('/');
      }
    };

    const waitForSession = async (attempts = 20, delayMs = 500) => {
      for (let i = 0; i < attempts; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          return session;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return null;
    };

    const recoverSession = async () => {
      try {
        // 1) Handle PKCE/code-based callback if present.
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            const session = await waitForSession();
            if (session) {
              handleRedirect();
              return;
            }
          }
        }

        // 2) Handle hash token callback explicitly if present.
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            const session = await waitForSession();
            if (session) {
              handleRedirect();
              return;
            }
          }
        }

        // 3) Fallback: ask SDK for any already-established session.
        const session = await waitForSession();
        if (session) {
          handleRedirect();
        }
      } catch (e) {
        console.error('[Auth Callback] Session recovery error:', e);
      }
    };

    void recoverSession();

    // Keep listener as backup for async auth state transitions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth Callback] Auth event:', event, session ? 'has session' : 'no session');
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          handleRedirect();
        }
      }
    );

    // Timeout for error display only (15 seconds is plenty for SDK to parse hash)
    const timeout = setTimeout(() => {
      if (!hasRedirected.current) {
        console.error('[Auth Callback] Timeout - no session detected');
        setError('Login timed out. The link may have expired.');
      }
    }, 15000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-semibold text-white mb-2">Login Failed</h2>
          <p className="text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="px-6 py-3 bg-[#FA4693] hover:bg-[#FB6BA8] text-white font-semibold rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-zinc-400">Completing login...</p>
      </div>
    </main>
  );
}
