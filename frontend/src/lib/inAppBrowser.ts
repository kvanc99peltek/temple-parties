/**
 * Instagram / Facebook / TikTok in-app browsers (WKWebView / Android WebView)
 * cannot complete Microsoft OAuth. The provider redirect never returns to
 * tuparties, so students mash Sign In (PostHog: 2.4 azure taps per person
 * on relaunch day). Detect those WebViews and punch out to Safari / Chrome
 * instead of starting OAuth inside them.
 *
 * UA matching is conservative: named social apps + Android `; wv)`. We do
 * not treat "AppleWebKit without Safari" as in-app — that false-positives
 * Chrome iOS.
 */

export type InAppApp =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'snapchat'
  | 'twitter'
  | 'other';

export type InAppPlatform = 'ios' | 'android' | 'other';

export type InAppBrowser =
  | { inApp: true; app: InAppApp; platform: InAppPlatform }
  | { inApp: false; app: null; platform: InAppPlatform };

const APP_PATTERNS: Array<{ app: InAppApp; pattern: RegExp }> = [
  { app: 'instagram', pattern: /Instagram/i },
  { app: 'facebook', pattern: /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger/i },
  { app: 'tiktok', pattern: /TikTok|BytedanceWebview|musical_ly/i },
  { app: 'snapchat', pattern: /Snapchat/i },
  { app: 'twitter', pattern: /Twitter/i },
];

function platformFromUa(ua: string): InAppPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export function detectInAppBrowser(userAgent: string): InAppBrowser {
  const ua = userAgent || '';
  const platform = platformFromUa(ua);

  for (const { app, pattern } of APP_PATTERNS) {
    if (pattern.test(ua)) {
      return { inApp: true, app, platform };
    }
  }

  // Generic Android WebView. `; wv)` is Chromium's marker; standalone Chrome
  // does not include it.
  if (platform === 'android' && /; wv\)/i.test(ua)) {
    return { inApp: true, app: 'other', platform };
  }

  return { inApp: false, app: null, platform };
}

export function appDisplayName(app: InAppApp): string {
  switch (app) {
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
    case 'tiktok':
      return 'TikTok';
    case 'snapchat':
      return 'Snapchat';
    case 'twitter':
      return 'X';
    default:
      return 'this app';
  }
}

export function openBrowserLabel(platform: InAppPlatform): string {
  if (platform === 'ios') return 'Open in Safari';
  if (platform === 'android') return 'Open in Chrome';
  return 'Open in browser';
}

export function menuHint(app: InAppApp): string {
  if (app === 'instagram') return 'Or tap ••• then Open in Browser';
  if (app === 'facebook') return 'Or tap ••• then Open in Safari';
  return 'Or open this page from the browser menu';
}

/**
 * Custom-scheme URL that hands the current page to the system browser.
 * iOS: undocumented `x-safari-https://` (still the reliable Instagram punch-out).
 * Android: Chrome intent. Returns null when we can't build a safe URL.
 */
export function systemBrowserUrl(pageUrl: string, platform: InAppPlatform): string | null {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  const rest = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;

  if (platform === 'ios') {
    return `x-safari-${parsed.protocol}//${rest}`;
  }
  if (platform === 'android') {
    const scheme = parsed.protocol.replace(':', '');
    const fallback = encodeURIComponent(parsed.toString());
    return `intent://${rest}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  }
  return null;
}
