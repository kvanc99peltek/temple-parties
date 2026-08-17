import {
  isTempleEmail,
  loginErrorFromQuery,
  microsoftCallbackUrl,
  sanitizeNextPath,
} from '@/lib/authHelpers';

describe('isTempleEmail', () => {
  it('accepts temple.edu ignoring case and space', () => {
    expect(isTempleEmail('a@temple.edu')).toBe(true);
    expect(isTempleEmail('  B@Temple.EDU ')).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isTempleEmail('a@gmail.com')).toBe(false);
    expect(isTempleEmail('a@temple.edu.fake.com')).toBe(false);
    expect(isTempleEmail(null)).toBe(false);
  });
});

describe('sanitizeNextPath', () => {
  it('keeps in-app relative paths', () => {
    expect(sanitizeNextPath('/create')).toBe('/create');
    expect(sanitizeNextPath('/party/abc')).toBe('/party/abc');
  });

  it('rejects open redirects', () => {
    expect(sanitizeNextPath('https://evil.com')).toBe('/');
    expect(sanitizeNextPath('//evil.com')).toBe('/');
    expect(sanitizeNextPath('\\evil')).toBe('/');
    expect(sanitizeNextPath(null)).toBe('/');
  });
});

describe('microsoftCallbackUrl', () => {
  it('points at /auth/callback and encodes next', () => {
    expect(microsoftCallbackUrl('http://localhost:3000', '/create')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fcreate'
    );
    expect(microsoftCallbackUrl('http://localhost:3000', '/')).toBe(
      'http://localhost:3000/auth/callback'
    );
  });
});

describe('loginErrorFromQuery', () => {
  it('explains temple-only and admin-consent failures', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=temple'))).toMatch(/Temple Microsoft/);
    expect(
      loginErrorFromQuery(new URLSearchParams('error_description=AADSTS65001+admin+consent'))
    ).toMatch(/approve this app/);
  });

  // The login page seeds its error banner from this. A clean visit must return
  // empty string, or every student sees a red box on a perfectly fine page.
  it('returns empty string when there is no error in the URL', () => {
    expect(loginErrorFromQuery(new URLSearchParams(''))).toBe('');
    expect(loginErrorFromQuery(new URLSearchParams('next=%2Fcreate'))).toBe('');
  });

  it('falls back to a generic message for unrecognized provider errors', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=access_denied'))).toMatch(
      /Microsoft sign-in failed/
    );
  });

  // /auth/callback preserves `next` alongside `error`; the presence of a
  // destination must not change which message we show.
  it('ignores next when deciding the message', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=temple&next=%2Fparty%2Fabc'))).toMatch(
      /Temple Microsoft/
    );
  });
});
