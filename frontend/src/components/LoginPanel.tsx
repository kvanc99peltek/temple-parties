'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { bindPageShow, loginButtonLabel, loginErrorFromQuery } from '@/lib/authHelpers';
import { saveAuthNextPath } from '@/lib/pendingAuthAction';
import {
  appDisplayName,
  detectInAppBrowser,
  escapeSteps,
  escapeUrl,
  openBrowserLabel,
  type InAppBrowser,
} from '@/lib/inAppBrowser';
import { trackEvent } from '@/utils/analytics';

/**
 * Shared Microsoft / in-app-browser sign-in controls.
 * Used by /login and by the logged-out AuthWall overlay.
 */
export default function LoginPanel({
  nextPath,
  errorQuery,
}: {
  nextPath: string;
  /** Raw search string (or URLSearchParams) so OAuth error codes survive a bounce. */
  errorQuery?: URLSearchParams;
}) {
  const { signInWithMicrosoft } = useAuth();
  const [error, setError] = useState(() =>
    errorQuery ? loginErrorFromQuery(errorQuery) : ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [inApp, setInApp] = useState<InAppBrowser | null>(null);

  useEffect(() => {
    saveAuthNextPath(nextPath);
  }, [nextPath]);

  useEffect(() => {
    const detected = detectInAppBrowser(navigator.userAgent);
    setInApp(detected);
    if (detected.inApp) {
      trackEvent('in_app_browser_detected', { app: detected.app, platform: detected.platform });
    }
  }, []);

  useEffect(() => bindPageShow(() => setSubmitting(false)), []);

  const startMicrosoft = async (selectAccount = false) => {
    if (inApp?.inApp) return;
    setError('');
    setSubmitting(true);
    saveAuthNextPath(nextPath);

    const result = await signInWithMicrosoft(nextPath, { selectAccount });

    if (!result.success) {
      setSubmitting(false);
      setError(result.error || 'Sign-in failed. Try again.');
    }
  };

  if (inApp === null) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
      </div>
    );
  }

  if (inApp.inApp) {
    return (
      <>
        <InAppEscape gate={inApp} />
        <div className="mt-6">
          <InAppEscapeActions gate={inApp} />
        </div>
      </>
    );
  }

  return (
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
        className="w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-temple-purple hover:bg-[#c46eff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loginButtonLabel(submitting)}
      </button>

      <button
        type="button"
        onClick={() => void startMicrosoft(true)}
        disabled={submitting}
        className="mt-4 w-full text-center text-sm font-montserrat text-white/60 hover:text-white underline disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Use a different account
      </button>

      <p className="mt-6 text-center text-white/40 font-montserrat text-xs leading-relaxed text-balance">
        You sign in through your school&apos;s system, we never see your password.
        First time? You&apos;ll be asked to allow access.
      </p>
      <p className="mt-2 text-center text-temple-purple-light font-montserrat text-xs font-bold leading-relaxed text-balance">
        Private/incognito tabs forget you. Use a regular tab to stay logged in.
      </p>
    </>
  );
}

type InAppGate = Extract<InAppBrowser, { inApp: true }>;

function InAppEscape({ gate }: { gate: InAppGate }) {
  const browser = gate.platform === 'android' ? 'Chrome' : 'Safari';
  const steps = escapeSteps(gate.app, gate.platform);
  return (
    <>
      <h2 className="text-white text-2xl font-semibold font-montserrat">
        {appDisplayName(gate.app)} can&apos;t sign you in
      </h2>
      <p className="text-white/60 font-montserrat text-sm mt-2 leading-relaxed">
        Sign in has to happen in {browser}. Do this:
      </p>
      <ol className="mt-4 text-left text-white font-montserrat text-sm leading-relaxed space-y-2">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="text-temple-purple font-semibold tabular-nums">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

async function copyPageUrl(): Promise<boolean> {
  const url = window.location.href;
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
    if (ok) return true;
  } catch {
    // fall through
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

function InAppEscapeActions({ gate }: { gate: InAppGate }) {
  const [copied, setCopied] = useState(false);
  const label = openBrowserLabel(gate.platform);
  const browser = gate.platform === 'android' ? 'Chrome' : 'Safari';

  const copyNow = () => {
    void copyPageUrl().then((ok) => {
      trackEvent('in_app_browser_copy_link', {
        app: gate.app,
        platform: gate.platform,
        success: ok,
      });
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      }
    });
  };

  const onTryEscape = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const scheme = escapeUrl(window.location.href, gate);
    if (scheme) {
      window.location.href = scheme;
    }
    trackEvent('in_app_browser_open_safari', { app: gate.app, platform: gate.platform });
    copyNow();
  };

  const primaryClass =
    'w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-temple-purple hover:bg-[#c46eff] transition-colors active:scale-[0.98]';
  const secondaryClass =
    'w-full flex items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white border border-white/20 hover:border-white/40 transition-colors active:scale-[0.98]';

  return (
    <>
      <button type="button" onClick={copyNow} className={primaryClass}>
        {copied ? `Copied — paste in ${browser}` : 'Copy link'}
      </button>
      <button type="button" onClick={onTryEscape} className={`mt-3 ${secondaryClass}`}>
        {label}
      </button>
      <p className="mt-4 text-center text-white/40 font-montserrat text-xs leading-relaxed">
        Copy is the reliable one. {label} is a shortcut some phones still allow.
      </p>
    </>
  );
}
