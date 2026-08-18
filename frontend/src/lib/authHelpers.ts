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

export function loginErrorFromQuery(params: URLSearchParams): string {
  const code = params.get('error');
  const description = (params.get('error_description') || params.get('error') || '').toLowerCase();

  if (code === 'temple' || description.includes('temple.edu')) {
    return 'Use your Temple Microsoft account (@temple.edu)';
  }
  if (
    description.includes('admin') ||
    description.includes('aadsts65001') ||
    description.includes('aadsts90094')
  ) {
    return 'Temple has to approve this app before students can sign in. Ask IT, or try again after admin consent.';
  }
  if (code || params.get('error_description')) {
    return 'Microsoft sign-in failed. Try again.';
  }
  return '';
}
