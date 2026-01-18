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
 * Get the upcoming Friday and Saturday dates for display in tabs
 */
export function getUpcomingDates(): { friday: string; saturday: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Calculate days until Friday (5)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  // If it's Saturday or Sunday, get next Friday
  if (dayOfWeek === 0) daysUntilFriday = 5; // Sunday -> next Friday
  if (dayOfWeek === 6) daysUntilFriday = 6; // Saturday -> next Friday

  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
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
