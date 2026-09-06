'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginPanel from '@/components/LoginPanel';
import {
  loginPitch,
  onboardingPath,
  sanitizeNextPath,
} from '@/lib/authHelpers';
import { peekPendingAuthAction } from '@/lib/pendingAuthAction';

/**
 * Login screen — Microsoft (Azure) is the only live sign-in path.
 *
 * One screen: reason to sign in + the SSO button. A previous Continue → Sign In
 * split hid Microsoft until a second tap and bounced ~half of /login visitors
 * (TUP-6 / Aug 18). The email-OTP flow still exists end to end (`requestOtp` /
 * `verifyOtp` in AuthContext, `/auth/otp/*` in the backend) but is deliberately
 * not rendered here. It is the break-glass fallback: if Temple IT ever blocks
 * user consent for third-party apps, students hit AADSTS65001 and Microsoft
 * stops working for everyone. Restoring the code form is a one-file change
 * to this page.
 *
 * Instagram / Facebook in-app browsers never complete Azure OAuth (the
 * redirect dies in the WebView). Microsoft is hidden; LoginPanel tries the
 * app's escape scheme on tap and shows the ••• menu path that still works
 * when Instagram swallows the scheme. `?next=` stays on the URL so Safari
 * still returns them to the party they came from (TUP-5).
 *
 * Logged-out visits to the rest of the app use AuthWall (same LoginPanel)
 * so this page is mainly OAuth error bounces and a dedicated sign-in URL.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = sanitizeNextPath(searchParams.get('next'));

  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const [pendingType, setPendingType] = useState<'going' | 'addParty' | null>(null);

  const pitch = useMemo(() => loginPitch(nextPath, pendingType), [nextPath, pendingType]);

  useEffect(() => {
    setPendingType(peekPendingAuthAction()?.type ?? null);
  }, [nextPath]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    router.replace(needsOnboarding ? onboardingPath(nextPath) : nextPath);
  }, [isAuthenticated, isLoading, needsOnboarding, nextPath, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="inline-block text-[32px] leading-[24px] font-bitcount text-white mb-6"
        >
          Temple
          <br />
          Parties
        </Link>
        <h1 className="text-white text-2xl font-semibold font-montserrat">{pitch.title}</h1>
        <p className="text-white/60 font-montserrat text-sm mt-2 leading-relaxed">{pitch.body}</p>
      </div>

      <LoginPanel nextPath={nextPath} errorQuery={searchParams} />
    </div>
  );
}

/** Auth shell — FLOW 1 / FLOW 3. No bottom nav. */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
