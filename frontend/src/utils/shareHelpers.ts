import { getDayName } from './dateHelpers';

import { Party } from '@/lib/types';
import { APP_URL } from '@/lib/constants';

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
 * Share content using Web Share API or fallback to clipboard
 */
export async function shareContent(party?: Party): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
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

  try {
    await navigator.clipboard.writeText(party ? formatPartyShareText(party) : url);
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
