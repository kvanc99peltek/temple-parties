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
 *
 * Instagram/Threads patched `x-safari-https://` in mid-2025. Inside Meta
 * apps the tap must fire `instagram://extbrowser` (or `barcelona://`) in
 * the same user-gesture tick. If that is swallowed, the ••• menu is the
 * path that still works.
 */

export type InAppApp =
  | 'instagram'
  | 'threads'
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

  // Threads UA is "Barcelona" and often also contains "Instagram".
  if (/Barcelona/i.test(ua)) {
    return { inApp: true, app: 'threads', platform };
  }

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
    case 'threads':
      return 'Threads';
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

export function escapeSteps(app: InAppApp, platform: InAppPlatform): string[] {
  const browser = platform === 'android' ? 'Chrome' : 'Safari';
  if (app === 'instagram' || app === 'threads') {
    return [`Tap ••• at the top right`, `Tap Open in Browser — that opens ${browser}`];
  }
  if (app === 'facebook') {
    return [`Tap ••• at the top right`, `Tap Open in Safari / Open in external browser`];
  }
  if (app === 'tiktok') {
    return [`Tap ⋯ on this screen`, `Tap Open in browser`];
  }
  return [`Copy the link`, `Paste it in ${browser}`];
}

function httpsPageUrl(pageUrl: string): URL | null {
  try {
    const parsed = new URL(pageUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Custom-scheme URL that hands the current page to the system browser.
 * Non-Meta iOS: `x-safari-https://`. Android: Chrome intent.
 */
export function systemBrowserUrl(pageUrl: string, platform: InAppPlatform): string | null {
  const parsed = httpsPageUrl(pageUrl);
  if (!parsed) return null;

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

/**
 * Scheme to assign on a real tap (`window.location.href`, same tick).
 * Instagram/Threads block x-safari-https; they still honor extbrowser when
 * the call is tied to a user gesture.
 */
export function escapeUrl(
  pageUrl: string,
  gate: Extract<InAppBrowser, { inApp: true }>
): string | null {
  const parsed = httpsPageUrl(pageUrl);
  if (!parsed) return null;

  if (gate.platform === 'ios' && gate.app === 'instagram') {
    return `instagram://extbrowser/?url=${encodeURIComponent(parsed.toString())}`;
  }
  if (gate.platform === 'ios' && gate.app === 'threads') {
    return `barcelona://extbrowser/?url=${encodeURIComponent(parsed.toString())}`;
  }

  return systemBrowserUrl(pageUrl, gate.platform);
}
