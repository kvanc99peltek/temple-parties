import { getDayName } from './dateHelpers';

import { Party } from '@/lib/types';
import { APP_URL } from '@/lib/constants';
import { detectInAppBrowser, type InAppPlatform } from '@/lib/inAppBrowser';

export type ShareMethod = 'share' | 'clipboard' | 'instagram_story';
export type ShareResult = { success: boolean; method: ShareMethod };

/**
 * Caption only — no URL. iOS Messages unfurls `navigator.share({ url })`
 * AND any URL inside `text`, which was pasting the link twice.
 */
export function formatPartyShareCaption(party: Party): string {
  const dayName = getDayName(party.day);
  const lines = [
    `pulling up to ${party.title}! by ${party.host}`,
    `${dayName} @ ${party.doorsOpen}`,
  ];
  if (party.goingCount != null) {
    lines.push(`${party.goingCount}+ going`);
  }
  return lines.join('\n');
}

function partyUrl(party: Party): string {
  return `${APP_URL}/party/${party.id}`;
}

/** Clipboard / fallback: caption + the link once. */
export function formatPartyShareText(party: Party): string {
  return `${formatPartyShareCaption(party)}\n\n${partyUrl(party)}`;
}

/**
 * Copy via execCommand first. iOS Safari and Instagram's WebView often
 * deny `clipboard.writeText` (and the async API also loses the user
 * gesture after `await navigator.share()`). Same order as the login-page
 * in-app escape hatch.
 */
export function copyTextSync(text: string): boolean {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy');
    document.body.removeChild(el);
    return !!ok;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (copyTextSync(text)) return true;
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function copyPartyLink(party: Party): Promise<ShareResult> {
  const ok = await copyText(formatPartyShareText(party));
  return { success: ok, method: 'clipboard' };
}

/** Deep-link that opens Instagram's story camera. */
export function instagramStoryCameraUrl(platform: InAppPlatform): string {
  if (platform === 'android') {
    return 'intent://instagram.com/_n/create/story#Intent;package=com.instagram.android;scheme=https;end';
  }
  return 'instagram://story-camera';
}

function openInstagramStoryCamera(platform: InAppPlatform): void {
  const a = document.createElement('a');
  a.href = instagramStoryCameraUrl(platform);
  a.rel = 'noreferrer';
  a.click();
}

/**
 * Copy the party link, then open Instagram's story camera so the student
 * can paste it. Already inside Instagram's WebView: skip the scheme
 * (they're in the app) and let the toast tell them to paste.
 */
export async function sharePartyToInstagramStory(party: Party): Promise<ShareResult> {
  const text = formatPartyShareText(party);
  // Copy in this tick so the following <a> click still counts as the tap.
  // Instagram only honors custom schemes in the same user-gesture tick.
  let copied = copyTextSync(text);

  const gate = detectInAppBrowser(navigator.userAgent);
  const alreadyInIg = gate.inApp && (gate.app === 'instagram' || gate.app === 'threads');
  if (copied && !alreadyInIg) {
    openInstagramStoryCamera(gate.platform);
  }

  if (!copied) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
    if (copied && !alreadyInIg) openInstagramStoryCamera(gate.platform);
  }

  return { success: copied, method: 'instagram_story' };
}

/**
 * Share content using Web Share API or fallback to clipboard
 */
export async function shareContent(party?: Party): Promise<ShareResult> {
  const url = party ? partyUrl(party) : APP_URL;

  if (navigator.share) {
    try {
      if (party) {
        await navigator.share({
          title: party.title,
          text: formatPartyShareCaption(party),
          url,
        });
      } else {
        await navigator.share({
          title: 'Temple Parties',
          url,
        });
      }
      return { success: true, method: 'share' };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, method: 'share' };
      }
    }
  }

  const ok = await copyText(party ? formatPartyShareText(party) : url);
  return { success: ok, method: 'clipboard' };
}

/**
 * Open address in maps for walking directions.
 * Apple Maps on iPhone; Google Maps walking Directions API elsewhere (§8.6).
 */
export function openMapsDirections(address: string): void {
  const encodedAddress = encodeURIComponent(address);
  const isIPhone = /iPhone/i.test(navigator.userAgent);

  const mapsUrl = isIPhone
    ? `https://maps.apple.com/?daddr=${encodedAddress}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=walking`;

  window.open(mapsUrl, '_blank');
}
