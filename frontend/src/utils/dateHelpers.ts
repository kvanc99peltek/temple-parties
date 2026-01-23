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
