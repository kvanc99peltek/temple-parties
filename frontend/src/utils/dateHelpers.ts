/**
 * Get the default day to display based on current day of week
 * - Monday through Friday → Show Friday parties
 * - Saturday → Show Saturday parties
 * - Sunday → Show Friday parties (next week)
 */
export function getDefaultDay(): 'friday' | 'saturday' {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 6) {
    return 'saturday';
  }
  return 'friday';
}

/**
 * Get the current weekend's Friday and Saturday dates for display in tabs.
 * On Sat/Sun, shows this weekend. On Mon-Fri, shows upcoming weekend.
 */
export function getUpcomingDates(): { friday: string; saturday: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

  // Calculate days to Friday
  // On Saturday (6) or Sunday (0), go back to this Friday
  // On Mon-Fri (1-5), go forward to next Friday
  let daysToFriday: number;
  if (dayOfWeek === 0) {
    // Sunday -> go back 2 days to Friday
    daysToFriday = -2;
  } else if (dayOfWeek === 6) {
    // Saturday -> go back 1 day to Friday
    daysToFriday = -1;
  } else {
    // Mon-Fri -> go forward to Friday
    daysToFriday = 5 - dayOfWeek;
  }

  const friday = new Date(today);
  friday.setDate(today.getDate() + daysToFriday);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const formatDate = (date: Date): string => {
    const day = date.getDate();
    return `${day}`;
  };

  return {
    friday: formatDate(friday),
    saturday: formatDate(saturday)
  };
}

/**
 * Get day name for share text
 */
export function getDayName(day: 'friday' | 'saturday'): string {
  return day === 'friday' ? 'Friday' : 'Saturday';
}

/**
 * Parse a doors_open string (e.g., "10 PM", "9:30 PM") and a date string
 * into a Date object.
 */
export function parseDoorsOpen(doorsOpen: string, dateStr: string): Date {
  const datePart = dateStr.split('T')[0];
  const partyDate = new Date(datePart + 'T00:00:00');

  const timeStr = doorsOpen.trim().toUpperCase();
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);

  if (!match) {
    // Fallback: 10 PM
    partyDate.setHours(22, 0, 0, 0);
    return partyDate;
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  partyDate.setHours(hours, minutes, 0, 0);
  return partyDate;
}

/**
 * Check if rating is currently active for a party.
 * Active once current time >= doorsOpen time.
 */
export function isRatingActive(doorsOpen: string, dateStr: string): boolean {
  const openTime = parseDoorsOpen(doorsOpen, dateStr);
  return new Date() >= openTime;
}

/**
 * Check if rating period has ended.
 * Locked after Monday 11:59:59 PM of the party weekend.
 * dateStr is the party date (YYYY-MM-DD), Friday or Saturday.
 */
export function isRatingLocked(dateStr: string): boolean {
  const partyDate = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = partyDate.getDay(); // 5=Friday, 6=Saturday
  const daysToMonday = dayOfWeek === 6 ? 2 : 3;
  const mondayCutoff = new Date(partyDate);
  mondayCutoff.setDate(partyDate.getDate() + daysToMonday);
  mondayCutoff.setHours(23, 59, 59, 999);
  return new Date() > mondayCutoff;
}
