import { getDayName } from './dateHelpers';

export interface Party {
  id: string;
  title: string;
  host: string;
  category: string;
  day: 'friday' | 'saturday';
  doorsOpen: string;
  address: string;
  goingCount: number;
}

const APP_URL = 'https://templeparties.com';

/**
 * Format share text when user has marked a party as going
 */
function formatPartyShareText(party: Party): string {
  const dayName = getDayName(party.day);
  return `I'm going to ${party.title}!
${dayName} ${party.doorsOpen} @ ${party.address}
${party.goingCount}+ people going

Check out Temple Parties: ${APP_URL}`;
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

  // Try native share first
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: party ? undefined : APP_URL
      });
      return { success: true, method: 'share' };
    } catch (error) {
      // User cancelled or error - fall through to clipboard
      if ((error as Error).name === 'AbortError') {
        return { success: false, method: 'share' };
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: 'clipboard' };
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, method: 'clipboard' };
  }
}

/**
 * Open address in maps for directions
 */
export function openMapsDirections(address: string): void {
  const mapsUrl = `https://maps.google.com/maps?daddr=${encodeURIComponent(address)}`;
  window.open(mapsUrl, '_blank');
}
