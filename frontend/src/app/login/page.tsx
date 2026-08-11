'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'email' | 'code';

const RESEND_COOLDOWN_SEC = 30;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const { isAuthenticated, isLoading, needsOnboarding, requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    router.replace(needsOnboarding ? `/onboarding?next=${encodeURIComponent(nextPath)}` : nextPath);
  }, [isAuthenticated, isLoading, needsOnboarding, nextPath, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    const result = await requestOtp(email);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Failed to send code');
      return;
    }
    setInfo('Code sent — check your inbox');
    setStep('code');
    setResendIn(RESEND_COOLDOWN_SEC);
  };

  const confirmCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    const result = await verifyOtp(email, code);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Invalid or expired code');
      return;
    }
    // Redirect handled by the auth effect once profile syncs.
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
        <Link href="/" className="inline-block text-[32px] leading-[24px] font-bitcount text-white mb-6">
          Temple
          <br />
          Parties
        </Link>
        <h1 className="text-white text-2xl font-montserrat font-semibold">
          {step === 'email' ? 'Sign in' : 'Enter your code'}
        </h1>
        <p className="text-white/60 font-montserrat text-sm mt-2">
          {step === 'email'
            ? 'Use your @temple.edu email. We will email you a 6-digit code.'
            : `We sent a 6-digit code to ${email}`}
        </p>
      </div>

      {step === 'email' && (
        <form onSubmit={sendCode} className="space-y-4">
          <label className="block">
            <span className="sr-only">Temple email</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@temple.edu"
              className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-white/40 font-montserrat focus:border-[#b24bf3] focus:ring-1 focus:ring-[#b24bf3] outline-none"
            />
          </label>
          {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] hover:bg-[#c46eff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={confirmCode} className="space-y-4">
          <label className="block">
            <span className="sr-only">6-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="123456"
              className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-center text-2xl tracking-[0.4em] font-montserrat focus:border-[#b24bf3] focus:ring-1 focus:ring-[#b24bf3] outline-none"
            />
          </label>
          {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
          {info && !error && <p className="text-emerald-400 text-sm font-montserrat">{info}</p>}
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] hover:bg-[#c46eff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </button>
          <div className="flex flex-col gap-2 items-center pt-1">
            <button
              type="button"
              disabled={submitting || resendIn > 0}
              onClick={() => void sendCode()}
              className="text-sm font-montserrat text-white/60 hover:text-white disabled:opacity-40 underline"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
                setInfo('');
              }}
              className="text-sm font-montserrat text-white/40 hover:text-white/70"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Auth shell — FLOW 1 / FLOW 3. No bottom nav. */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
