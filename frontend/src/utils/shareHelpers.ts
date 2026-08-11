import { getDayName } from './dateHelpers';

import { Party } from '@/lib/types';
import { APP_URL } from '@/lib/constants';

/**
 * Format share text when user has marked a party as going
 */
function formatPartyShareText(party: Party): string {
  const dayName = getDayName(party.day);
  const partyUrl = `${APP_URL}/party/${party.id}`;
  const goingLine =
    party.goingCount != null ? `${party.goingCount}+ going\n` : '';
  return `pulling up to ${party.title}! by ${party.host}
${dayName} @ ${party.doorsOpen}
${goingLine}
${partyUrl}`;
}

/**
 * Format share text when user hasn't marked any parties
 */
function formatDefaultShareText(): string {
  return APP_URL;
}

/**
 * Share content using Web Share API or fallback to clipboard
 */
export async function shareContent(party?: Party): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  const text = party ? formatPartyShareText(party) : formatDefaultShareText();
  const title = 'Temple Parties';
  const partyUrl = party ? `${APP_URL}/party/${party.id}` : APP_URL;

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: partyUrl,
      });
      return { success: true, method: 'share' };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return { success: false, method: 'share' };
      }
    }
  }

  try {
    await navigator.clipboard.writeText(party ? formatPartyShareText(party) : text);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, method: 'clipboard' };
  }
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
