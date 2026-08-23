export const TEMPLE_EMAIL_SUFFIX = '@temple.edu';

export function isTempleEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase().endsWith(TEMPLE_EMAIL_SUFFIX);
}

/** Only allow in-app relative paths for post-login redirects. */
export function sanitizeNextPath(raw: string | null | undefined): string {
  const next = (raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/';
  }
  return next;
}

export function microsoftCallbackUrl(origin: string, nextPath: string): string {
  const next = sanitizeNextPath(nextPath);
  const url = new URL('/auth/callback', origin);
  if (next !== '/') {
    url.searchParams.set('next', next);
  }
  return url.toString();
}

/** Keep `?next=` through the onboarding gate so SSO doesn't dump people on home. */
export function onboardingPath(nextPath: string): string {
  const next = sanitizeNextPath(nextPath);
  if (next === '/' || next.startsWith('/onboarding')) {
    return '/onboarding';
  }
  return `/onboarding?next=${encodeURIComponent(next)}`;
}

export function partyPath(partyId: string): string {
  return `/party/${partyId}`;
}

export type LoginPitch = { title: string; body: string };

export const SIGNUP_FAILED_MESSAGE = 'Sign up failed. Try again.';

/**
 * Login headline + subcopy. Always "Sign up" — no provider name or logo on
 * this screen. Students hit Temple SSO after they tap the button.
 */
export function loginPitch(): LoginPitch {
  return {
    title: 'Sign up',
    body: 'Sign up with your school email. This helps us ensure parties are only accessible to students',
  };
}

export function loginErrorFromQuery(params: URLSearchParams): string {
  const code = params.get('error');
  const description = (params.get('error_description') || params.get('error') || '').toLowerCase();

  if (code === 'temple' || description.includes('temple.edu')) {
    return 'Use your @temple.edu email';
  }
  if (
    description.includes('admin') ||
    description.includes('aadsts65001') ||
    description.includes('aadsts90094')
  ) {
    return 'Temple has to approve this app before students can sign up. Ask IT, or try again after admin consent.';
  }
  if (code || params.get('error_description')) {
    return SIGNUP_FAILED_MESSAGE;
  }
  return '';
}
