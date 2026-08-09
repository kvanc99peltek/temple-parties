'use client';

/**
 * Temporary local harness for Epic 3 OTP testing.
 * Remove once Epic 6 auth screens ship.
 */
import { useState } from 'react';
import { authApi } from '@/services/api';
import { supabase } from '@/lib/supabase';

type Step = 'email' | 'code' | 'done';

export default function DevOtpPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileJson, setProfileJson] = useState('');

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await authApi.requestOtp(email.trim().toLowerCase());
      setInfo(res.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const session = await authApi.verifyOtp(email.trim().toLowerCase(), code.trim());
      const { error: setErr } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (setErr) throw setErr;

      const profile = await authApi.getMe();
      setProfileJson(JSON.stringify(profile, null, 2));
      setInfo('Verified — session set + /profiles/me ok');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verify failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">dev only</p>
          <h1 className="text-2xl font-semibold">OTP test harness</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Hits local API → DEV Supabase. Check your inbox for the 6-digit code.
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={requestCode} className="space-y-4">
            <label className="block text-sm text-zinc-300">
              Temple email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@temple.edu"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#b24bf3] py-2.5 font-medium disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-zinc-400">Code sent to <span className="text-white">{email}</span></p>
            <label className="block text-sm text-zinc-300">
              6-digit code
              <input
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 tracking-widest text-center text-xl"
              />
            </label>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-lg bg-[#b24bf3] py-2.5 font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
            <button
              type="button"
              className="w-full text-sm text-zinc-400 underline"
              onClick={() => { setStep('email'); setCode(''); setError(''); }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            <pre className="text-xs bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-auto max-h-80">
              {profileJson}
            </pre>
            <button
              type="button"
              className="w-full rounded-lg border border-zinc-600 py-2 text-sm"
              onClick={async () => {
                await supabase.auth.signOut();
                setStep('email');
                setCode('');
                setProfileJson('');
                setInfo('');
              }}
            >
              Sign out & reset
            </button>
          </div>
        )}

        {info && <p className="text-sm text-emerald-400">{info}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
