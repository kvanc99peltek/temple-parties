const USER_GOING_KEY = 'userGoingParties';
const PARTY_COUNTS_KEY = 'partyCounts';

export interface PartyCounts {
  [partyId: string]: number;
}

/**
 * Get array of party IDs the user has marked as going
 */
export function getStoredGoingParties(): string[] {
  try {
    const stored = localStorage.getItem(USER_GOING_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading going parties from localStorage:', error);
  }
  return [];
}

/**
 * Get stored party counts from localStorage
 */
export function getStoredPartyCounts(): PartyCounts {
  try {
    const stored = localStorage.getItem(PARTY_COUNTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading party counts from localStorage:', error);
  }
  return {};
}

/**
 * Add a party to the user's going list and increment its count
 */
export function addGoingParty(partyId: string, currentCount: number): { newCount: number; success: boolean } {
  try {
    // Update going parties array
    const goingParties = getStoredGoingParties();
    if (!goingParties.includes(partyId)) {
      goingParties.push(partyId);
      localStorage.setItem(USER_GOING_KEY, JSON.stringify(goingParties));
    }

    // Update party counts
    const counts = getStoredPartyCounts();
    const newCount = currentCount + 1;
    counts[partyId] = newCount;
    localStorage.setItem(PARTY_COUNTS_KEY, JSON.stringify(counts));

    return { newCount, success: true };
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return { newCount: currentCount + 1, success: false };
  }
}

/**
 * Check if user is going to a specific party
 */
export function isUserGoing(partyId: string): boolean {
  const goingParties = getStoredGoingParties();
  return goingParties.includes(partyId);
}

/**
 * Get the count for a specific party (from localStorage or fallback)
 */
export function getPartyCount(partyId: string, fallbackCount: number): number {
  const counts = getStoredPartyCounts();
  return counts[partyId] ?? fallbackCount;
}
