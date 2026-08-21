'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loginErrorFromQuery, loginPitch, onboardingPath, sanitizeNextPath } from '@/lib/authHelpers';
import { peekPendingAuthAction, saveAuthNextPath } from '@/lib/pendingAuthAction';
import {
  appDisplayName,
  detectInAppBrowser,
  menuHint,
  openBrowserLabel,
  systemBrowserUrl,
  type InAppBrowser,
} from '@/lib/inAppBrowser';
import { trackEvent } from '@/utils/analytics';

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
 * redirect dies in the WebView). Those students get an Open in Safari
 * screen instead of the Microsoft button. `?next=` stays on the URL so
 * Safari still returns them to the party they came from (TUP-5).
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
  const [pendingType, setPendingType] = useState<'going' | 'addParty' | null>(null);
  // null until client UA is read — SSR and hydration must match, so we
  // spinner rather than flash the Microsoft button inside Instagram.
  const [inApp, setInApp] = useState<InAppBrowser | null>(null);

  const pitch = useMemo(() => loginPitch(nextPath, pendingType), [nextPath, pendingType]);

  useEffect(() => {
    saveAuthNextPath(nextPath);
    setPendingType(peekPendingAuthAction()?.type ?? null);
  }, [nextPath]);

  useEffect(() => {
    const detected = detectInAppBrowser(navigator.userAgent);
    setInApp(detected);
    if (detected.inApp) {
      trackEvent('in_app_browser_detected', { app: detected.app, platform: detected.platform });
    }
  }, []);

  // Already signed in (e.g. hit /login with a live session) — get out of the
  // way. Unfinished onboarding takes priority over the requested destination.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    router.replace(needsOnboarding ? onboardingPath(nextPath) : nextPath);
  }, [isAuthenticated, isLoading, needsOnboarding, nextPath, router]);

  // `selectAccount` is for shared computers: it makes Microsoft show its
  // account picker instead of silently reusing whoever is already signed in.
  const startMicrosoft = async (selectAccount = false) => {
    if (inApp?.inApp) return;
    setError('');
    setSubmitting(true);
    saveAuthNextPath(nextPath);

    const result = await signInWithMicrosoft(nextPath, { selectAccount });

    // On success the browser is already navigating to Microsoft, so we leave
    // `submitting` true — re-enabling the button would just invite a second
    // click during the redirect. Only a failure returns us to an idle screen.
    if (!result.success) {
      setSubmitting(false);
      setError(result.error || 'Microsoft sign-in failed. Try again.');
    }
  };

  if (isLoading || isAuthenticated || inApp === null) {
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
        {inApp.inApp ? (
          <InAppEscape gate={inApp} />
        ) : (
          <>
            <h1 className="text-white text-2xl font-semibold font-montserrat">{pitch.title}</h1>
            <p className="text-white/60 font-montserrat text-sm mt-2 leading-relaxed">{pitch.body}</p>
          </>
        )}
      </div>

      {inApp.inApp ? (
        <InAppEscapeActions gate={inApp} />
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
            {submitting ? 'Redirecting…' : 'Sign in with Microsoft'}
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
        </>
      )}
    </div>
  );
}

type InAppGate = Extract<InAppBrowser, { inApp: true }>;

/** Heading when Microsoft OAuth cannot run inside this WebView. */
function InAppEscape({ gate }: { gate: InAppGate }) {
  const browser = gate.platform === 'android' ? 'Chrome' : 'Safari';
  return (
    <>
      <h1 className="text-white text-2xl font-semibold font-montserrat">Open in {browser}</h1>
      <p className="text-white/60 font-montserrat text-sm mt-2 leading-relaxed">
        {appDisplayName(gate.app)} can&apos;t finish Microsoft sign-in. Open this
        page in {browser} — we keep the party you came from.
      </p>
    </>
  );
}

async function copyPageUrl(): Promise<boolean> {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = url;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function InAppEscapeActions({ gate }: { gate: InAppGate }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const escapeHref = systemBrowserUrl(pageUrl, gate.platform);
  const label = openBrowserLabel(gate.platform);

  const onCopy = async () => {
    const ok = await copyPageUrl();
    trackEvent('in_app_browser_copy_link', {
      app: gate.app,
      platform: gate.platform,
      success: ok,
    });
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const primaryClass =
    'w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] hover:bg-[#c46eff] transition-colors active:scale-[0.98]';

  return (
    <>
      {escapeHref ? (
        <a
          href={escapeHref}
          onClick={() =>
            trackEvent('in_app_browser_open_safari', { app: gate.app, platform: gate.platform })
          }
          className={primaryClass}
        >
          {label}
        </a>
      ) : (
        <button type="button" onClick={() => void onCopy()} className={primaryClass}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      )}

      <p className="mt-4 text-center text-white/40 font-montserrat text-xs">{menuHint(gate.app)}</p>

      {escapeHref ? (
        <button
          type="button"
          onClick={() => void onCopy()}
          className="mt-4 w-full text-center text-sm font-montserrat text-white/60 hover:text-white underline"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
      ) : null}
    </>
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
