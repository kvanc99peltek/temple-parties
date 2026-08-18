'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loginErrorFromQuery, sanitizeNextPath } from '@/lib/authHelpers';

type LoginStep = 'why' | 'sign-in';

/**
 * Login screen — Microsoft (Azure) is the only live sign-in path.
 *
 * Two in-page steps: a campus-only explainer, then the SSO button. The
 * email-OTP flow still exists end to end (`requestOtp` / `verifyOtp` in
 * AuthContext, `/auth/otp/*` in the backend) but is deliberately not rendered
 * here. It is the break-glass fallback: if Temple IT ever blocks user consent
 * for third-party apps, students hit AADSTS65001 and Microsoft stops working
 * for everyone. Restoring the code form is a one-file change to this page.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to land after login. Sanitized so `?next=https://evil.com` can't
  // turn our own login page into an open redirect.
  const nextPath = sanitizeNextPath(searchParams.get('next'));

  const { isAuthenticated, isLoading, needsOnboarding, signInWithMicrosoft } = useAuth();

  // Errors arrive two ways: bounced back in the URL by /auth/callback (or by
  // Microsoft itself), or thrown locally when we fail to even start the
  // redirect. Seed from the URL so a bounced student sees why.
  const [error, setError] = useState(() => loginErrorFromQuery(searchParams));
  const [submitting, setSubmitting] = useState(false);
  // Bounced students skip the explainer so the error + retry button are
  // visible immediately.
  const [step, setStep] = useState<LoginStep>(() => (error ? 'sign-in' : 'why'));

  // Already signed in (e.g. hit /login with a live session) — get out of the
  // way. Unfinished onboarding takes priority over the requested destination.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    router.replace(needsOnboarding ? `/onboarding?next=${encodeURIComponent(nextPath)}` : nextPath);
  }, [isAuthenticated, isLoading, needsOnboarding, nextPath, router]);

  // `selectAccount` is for shared computers: it makes Microsoft show its
  // account picker instead of silently reusing whoever is already signed in.
  const startMicrosoft = async (selectAccount = false) => {
    setError('');
    setSubmitting(true);

    const result = await signInWithMicrosoft(nextPath, { selectAccount });

    // On success the browser is already navigating to Microsoft, so we leave
    // `submitting` true — re-enabling the button would just invite a second
    // click during the redirect. Only a failure returns us to an idle screen.
    if (!result.success) {
      setSubmitting(false);
      setError(result.error || 'Microsoft sign-in failed. Try again.');
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
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
        {step === 'why' ? (
          <>
            <h1 className="text-white text-2xl font-semibold font-montserrat">
              Temple students only
            </h1>
            <p className="text-white/60 font-montserrat text-sm mt-2 leading-relaxed">
              We require a Temple email so this stays campus — real students, not
              random people off the internet. That keeps parties safer.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-white text-2xl font-semibold font-montserrat">Create an account</h1>
            <p className="text-white/60 font-montserrat text-sm mt-2">
              Sign in with Temple Microsoft SSO. Students only.
            </p>
          </>
        )}
      </div>

      {step === 'why' ? (
        <button
          type="button"
          onClick={() => setStep('sign-in')}
          className="w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] hover:bg-[#c46eff] transition-colors active:scale-[0.98]"
        >
          Continue
        </button>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm font-montserrat"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void startMicrosoft()}
            disabled={submitting}
            className="w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] hover:bg-[#c46eff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? 'Redirecting…' : 'Sign In'}
          </button>

          {/* Escape hatch for a friend's computer: forces the Microsoft account
              picker so you can sign in as yourself instead of whoever this
              browser is already logged in as. */}
          <button
            type="button"
            onClick={() => void startMicrosoft(true)}
            disabled={submitting}
            className="mt-4 w-full text-center text-sm font-montserrat text-white/60 hover:text-white underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Use a different account
          </button>

          <p className="mt-6 text-center text-white/40 font-montserrat text-xs leading-relaxed">
            You sign in on Microsoft&apos;s page — we never see your password.
            <br />
            First time? Microsoft will ask you to allow access.
          </p>

          <button
            type="button"
            onClick={() => setStep('why')}
            disabled={submitting}
            className="mt-6 w-full text-center text-sm font-montserrat text-white/60 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </>
      )}
    </div>
  );
}

/** Auth shell — FLOW 1 / FLOW 3. No bottom nav. */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />}
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
