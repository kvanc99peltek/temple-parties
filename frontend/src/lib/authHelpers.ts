// The domain part of an allowed email: letters/digits/dots/dashes ending in
// .edu — e.g. "temple.edu", "sas.upenn.edu". Registering a .edu domain
// requires being an accredited US college, so "has a .edu address" is our
// "real student" check. Any school can sign in; parties are still Temple's.
// Anchored so "temple.edu.evil.com" (extra labels AFTER .edu) can't pass.
const EDU_DOMAIN_RE = /^[a-z0-9.-]+\.edu$/;

export function isEduEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? '').trim().toLowerCase();
  // Judge only the actual mail domain (after the last @) — and require a
  // real local part, so a bare "temple.edu" typed into the email box fails
  // here instead of bouncing off the backend's stricter validation.
  const at = normalized.lastIndexOf('@');
  if (at < 1) return false;
  return EDU_DOMAIN_RE.test(normalized.slice(at + 1));
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

export function loginErrorFromQuery(params: URLSearchParams): string {
  const code = params.get('error');
  const description = (params.get('error_description') || params.get('error') || '').toLowerCase();

  // 'edu' is our own bounce from /auth/callback: they signed in with a
  // Microsoft account that isn't a college one (personal Outlook, a job's
  // O365 tenant, …). 'temple' is the pre-Scope-A code, kept so an in-flight
  // bounce during the deploy still shows a real message.
  if (code === 'edu' || code === 'temple' || description.includes('.edu')) {
    return 'Use your school Microsoft account (a .edu college email)';
  }
  if (
    description.includes('admin') ||
    description.includes('aadsts65001') ||
    description.includes('aadsts90094')
  ) {
    return "Your school has to approve this app before students can sign in. Ask your IT help desk, or try again after they've approved it.";
  }
  if (code || params.get('error_description')) {
    return 'Microsoft sign-in failed. Try again.';
  }
  return '';
}
