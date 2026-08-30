import {
  bindPageShow,
  isTempleEmail,
  loginButtonLabel,
  loginErrorFromQuery,
  loginPitch,
  microsoftCallbackUrl,
  onboardingPath,
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

describe('onboardingPath', () => {
  it('passes the party through so onboarding does not dump people on home', () => {
    expect(onboardingPath('/party/abc')).toBe('/onboarding?next=%2Fparty%2Fabc');
    expect(onboardingPath('/map?party=abc')).toBe('/onboarding?next=%2Fmap%3Fparty%3Dabc');
  });

  it('does not nest onboarding or send next=/', () => {
    expect(onboardingPath('/')).toBe('/onboarding');
    expect(onboardingPath('/onboarding')).toBe('/onboarding');
    expect(onboardingPath('https://evil.com')).toBe('/onboarding');
  });
});

describe('loginPitch', () => {
  it('explains .edu, time, and GOING/ratings on a cold visit', () => {
    const pitch = loginPitch('/');
    expect(pitch.title).toMatch(/GOING/i);
    expect(pitch.body).toMatch(/\.edu/i);
    expect(pitch.body).toMatch(/10 seconds/);
    expect(pitch.body).toMatch(/ratings/i);
  });

  it('promises a return to the party when they came from GOING', () => {
    const pitch = loginPitch('/party/abc', 'going');
    expect(pitch.body).toMatch(/land back on the party/i);
  });

  it('switches copy for create-party', () => {
    expect(loginPitch('/create', 'addParty').title).toMatch(/post a party/i);
  });
});

describe('loginErrorFromQuery', () => {
  it('explains temple-only and admin-consent failures', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=temple'))).toMatch(/Temple email/);
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
      /Sign-in failed/
    );
  });

  // /auth/callback preserves `next` alongside `error`; the presence of a
  // destination must not change which message we show.
  it('ignores next when deciding the message', () => {
    expect(loginErrorFromQuery(new URLSearchParams('error=temple&next=%2Fparty%2Fabc'))).toMatch(
      /Temple email/
    );
  });
});

describe('loginButtonLabel', () => {
  it('always says Sign in, including while SSO is in flight', () => {
    expect(loginButtonLabel(false)).toBe('Sign in');
    expect(loginButtonLabel(true)).toBe('Sign in');
    expect(loginButtonLabel(true)).not.toMatch(/Microsoft|Redirecting|Temple Email/i);
  });
});

describe('bindPageShow', () => {
  it('runs the reset when the student comes back to the page', () => {
    const onShow = jest.fn();
    const unbind = bindPageShow(onShow);
    window.dispatchEvent(new Event('pageshow'));
    expect(onShow).toHaveBeenCalledTimes(1);
    unbind();
    window.dispatchEvent(new Event('pageshow'));
    expect(onShow).toHaveBeenCalledTimes(1);
  });
});
