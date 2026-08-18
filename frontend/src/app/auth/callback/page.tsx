'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isEduEmail, sanitizeNextPath } from '@/lib/authHelpers';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    // Bounce back to /login with the reason AND the original destination.
    // Losing `next` here would strand a student who came in from "Going" on a
    // party card: they'd fix the error, sign in, and land on the home feed
    // instead of the party they tapped.
    const fail = (code: string) => {
      const params = new URLSearchParams({ error: code });
      const next = sanitizeNextPath(searchParams.get('next'));
      if (next !== '/') {
        params.set('next', next);
      }
      router.replace(`/login?${params.toString()}`);
    };

    const run = async () => {
      const errorParam = searchParams.get('error_description') || searchParams.get('error');
      if (errorParam) {
        fail(errorParam);
        return;
      }

      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          fail(error.message);
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        fail('sign-in-failed');
        return;
      }

      if (!isEduEmail(session.user.email)) {
        await supabase.auth.signOut();
        fail('edu');
        return;
      }

      const next = sanitizeNextPath(searchParams.get('next'));
      router.replace(next);
    };

    void run().catch(() => {
      setMessage('Sign-in failed');
      fail('sign-in-failed');
    });
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
      <p className="text-white/60 font-montserrat text-sm">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        }
      >
        <AuthCallback />
      </Suspense>
    </main>
  );
}
