import {
  appDisplayName,
  detectInAppBrowser,
  escapeSteps,
  escapeUrl,
  openBrowserLabel,
  systemBrowserUrl,
} from '@/lib/inAppBrowser';

const INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 192.168.2.5.111 (iPhone17,1; iOS 18_0; en_US; en-US; scale=3.00; 1179x2556; 623367275)';

const INSTAGRAM_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 1.2.3.4.5 Android';

const THREADS_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 192.168.2.5.111 Barcelona 384.0.0.34.80';

const FACEBOOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/10.0;]';

const TIKTOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a0c7 TikTok';

const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';

const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.92 Mobile/15E148 Safari/604.1';

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

describe('detectInAppBrowser', () => {
  it('flags Instagram on iOS and Android', () => {
    expect(detectInAppBrowser(INSTAGRAM_IOS)).toEqual({
      inApp: true,
      app: 'instagram',
      platform: 'ios',
    });
    expect(detectInAppBrowser(INSTAGRAM_ANDROID)).toEqual({
      inApp: true,
      app: 'instagram',
      platform: 'android',
    });
  });

  it('flags Threads (Barcelona) before Instagram in the same UA', () => {
    expect(detectInAppBrowser(THREADS_IOS)).toEqual({
      inApp: true,
      app: 'threads',
      platform: 'ios',
    });
  });

  it('flags Facebook, TikTok, and generic Android WebView', () => {
    expect(detectInAppBrowser(FACEBOOK_IOS).app).toBe('facebook');
    expect(detectInAppBrowser(TIKTOK_IOS).app).toBe('tiktok');
    expect(detectInAppBrowser(ANDROID_WEBVIEW)).toEqual({
      inApp: true,
      app: 'other',
      platform: 'android',
    });
  });

  it('does not flag real Safari or Chrome', () => {
    expect(detectInAppBrowser(SAFARI_IOS)).toEqual({
      inApp: false,
      app: null,
      platform: 'ios',
    });
    expect(detectInAppBrowser(CHROME_IOS).inApp).toBe(false);
    expect(detectInAppBrowser(CHROME_ANDROID).inApp).toBe(false);
  });
});

describe('systemBrowserUrl', () => {
  const page = 'https://www.tuparties.com/login?next=%2Fparty%2Fabc';

  it('builds x-safari-https and keeps next', () => {
    expect(systemBrowserUrl(page, 'ios')).toBe(
      'x-safari-https://www.tuparties.com/login?next=%2Fparty%2Fabc'
    );
  });

  it('builds a Chrome intent on Android', () => {
    const url = systemBrowserUrl(page, 'android');
    expect(url).toContain('intent://www.tuparties.com/login?next=%2Fparty%2Fabc#Intent;');
    expect(url).toContain('scheme=https');
    expect(url).toContain('package=com.android.chrome');
    expect(url).toContain(encodeURIComponent(page));
  });

  it('builds x-safari-http for local http', () => {
    expect(systemBrowserUrl('http://localhost:3000/login?next=%2Fcreate', 'ios')).toBe(
      'x-safari-http://localhost:3000/login?next=%2Fcreate'
    );
  });

  it('rejects javascript: and unknown platforms', () => {
    expect(systemBrowserUrl('javascript:alert(1)', 'ios')).toBeNull();
    expect(systemBrowserUrl(page, 'other')).toBeNull();
  });
});

describe('escapeUrl', () => {
  const page = 'https://www.tuparties.com/login?next=%2Fparty%2Fabc';

  it('uses instagram extbrowser on iOS Instagram, not x-safari-https', () => {
    expect(
      escapeUrl(page, { inApp: true, app: 'instagram', platform: 'ios' })
    ).toBe(`instagram://extbrowser/?url=${encodeURIComponent(page)}`);
  });

  it('uses barcelona extbrowser on Threads', () => {
    expect(escapeUrl(page, { inApp: true, app: 'threads', platform: 'ios' })).toBe(
      `barcelona://extbrowser/?url=${encodeURIComponent(page)}`
    );
  });

  it('keeps x-safari-https for TikTok iOS', () => {
    expect(escapeUrl(page, { inApp: true, app: 'tiktok', platform: 'ios' })).toBe(
      'x-safari-https://www.tuparties.com/login?next=%2Fparty%2Fabc'
    );
  });

  it('keeps Chrome intent on Android Instagram', () => {
    const url = escapeUrl(page, { inApp: true, app: 'instagram', platform: 'android' });
    expect(url).toContain('intent://www.tuparties.com/login?next=%2Fparty%2Fabc#Intent;');
  });
});

describe('copy', () => {
  it('names the app and the button for the platform', () => {
    expect(appDisplayName('instagram')).toBe('Instagram');
    expect(openBrowserLabel('ios')).toBe('Open in Safari');
    expect(openBrowserLabel('android')).toBe('Open in Chrome');
  });
});

describe('escapeSteps', () => {
  it('tells Instagram users about the ••• menu', () => {
    const steps = escapeSteps('instagram', 'ios');
    expect(steps[0]).toMatch(/•••/);
    expect(steps[1]).toMatch(/Open in Browser/i);
  });
});
