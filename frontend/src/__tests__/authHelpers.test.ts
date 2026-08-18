import {
  isEduEmail,
  loginErrorFromQuery,
  microsoftCallbackUrl,
  sanitizeNextPath,
} from '@/lib/authHelpers';

describe('isEduEmail', () => {
  it('accepts any college .edu ignoring case and space', () => {
    expect(isEduEmail('a@temple.edu')).toBe(true);
    expect(isEduEmail('  B@Temple.EDU ')).toBe(true);
    expect(isEduEmail('a@drexel.edu')).toBe(true);
    // Subdomained school addresses are still that school.
    expect(isEduEmail('a@sas.upenn.edu')).toBe(true);
  });

  it('rejects non-college domains', () => {
    expect(isEduEmail('a@gmail.com')).toBe(false);
    // ".edu" buried mid-domain must not count — only the real TLD.
    expect(isEduEmail('a@temple.edu.fake.com')).toBe(false);
    expect(isEduEmail(null)).toBe(false);
  });

  it('rejects strings that are not addressed emails at all', () => {
    // A bare domain typed into the email box has no local part.
    expect(isEduEmail('temple.edu')).toBe(false);
    expect(isEduEmail('@temple.edu')).toBe(false);
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
  it('explains students-only and admin-consent failures', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=edu'))).toMatch(/\.edu/);
    // Pre-Scope-A bounces still in flight during a deploy carry error=temple.
    expect(loginErrorFromQuery(new URLSearchParams('error=temple'))).toMatch(/\.edu/);
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
    expect(loginErrorFromQuery(new URLSearchParams('error=edu&next=%2Fparty%2Fabc'))).toMatch(
      /\.edu/
    );
  });
});
