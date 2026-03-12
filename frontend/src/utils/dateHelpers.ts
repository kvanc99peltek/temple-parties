/**
 * Get the default day to display based on current day of week
 * - Monday through Friday → Show Friday parties
 * - Saturday → Show Saturday parties
 * - Sunday → Show Friday parties (this weekend)
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
 * Get the upcoming weekend's Friday and Saturday dates for display in home page tabs.
 * On Saturday-Sunday, shows this weekend. On Monday-Friday, shows next weekend.
 */
export function getUpcomingDates(): { friday: string; saturday: string } {
  const friday = getUpcomingFriday();
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  return {
    friday: `${friday.getDate()}`,
    saturday: `${saturday.getDate()}`
  };
}

/**
 * Get the past/current weekend's Friday and Saturday dates for display in rankings tabs.
 * Fri-Sat: current weekend. Sun-Thu: past weekend.
 */
export function getRankingsDates(): { friday: string; saturday: string } {
  const friday = getRankingsFriday();
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  return {
    friday: `${friday.getDate()}`,
    saturday: `${saturday.getDate()}`
  };
}

function getUpcomingFriday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  let daysToFriday: number;
  if (dayOfWeek === 0) {
    // Sunday -> this Friday (2 days ago), weekend isn't over yet
    daysToFriday = -2;
  } else if (dayOfWeek === 6) {
    // Saturday -> this Friday (yesterday)
    daysToFriday = -1;
  } else {
    // Mon-Fri -> next Friday
    daysToFriday = ((5 - dayOfWeek) + 7) % 7 || 7;
  }
  if (dayOfWeek === 5) daysToFriday = 0; // Friday -> today
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysToFriday);
  return friday;
}

function getRankingsFriday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  let daysToFriday: number;
  if (dayOfWeek === 5) {
    // Friday -> today
    daysToFriday = 0;
  } else if (dayOfWeek === 6) {
    // Saturday -> yesterday (this Friday)
    daysToFriday = -1;
  } else {
    // Sun-Thu -> past Friday
    // Sunday(0)->-2, Mon(1)->-3, Tue(2)->-4, Wed(3)->-5, Thu(4)->-6
    daysToFriday = -(((dayOfWeek - 5) + 7) % 7);
  }
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysToFriday);
  return friday;
}

/** ISO date string (YYYY-MM-DD) for the upcoming weekend's Friday. */
export function getUpcomingFridayISO(): string {
  return toISODate(getUpcomingFriday());
}

/** ISO date string (YYYY-MM-DD) for the rankings weekend's Friday. */
export function getRankingsFridayISO(): string {
  return toISODate(getRankingsFriday());
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/** ISO date string for last weekend's Friday (7 days before rankings Friday). */
export function getLastWeekendFridayISO(): string {
  const currentFriday = getRankingsFriday();
  const lastFriday = new Date(currentFriday);
  lastFriday.setDate(lastFriday.getDate() - 7);
  return toISODate(lastFriday);
}

/** Get the bounding Friday ISO dates for the current calendar month. */
export function getMonthRange(): { from: string; to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthStart = new Date(year, month, 1);
  const fromFriday = new Date(monthStart);
  while (fromFriday.getDay() !== 5) {
    fromFriday.setDate(fromFriday.getDate() + 1);
  }

  const lastDay = new Date(year, month + 1, 0);
  const toFriday = new Date(lastDay);
  while (toFriday.getDay() !== 5) {
    toFriday.setDate(toFriday.getDate() - 1);
  }

  return { from: toISODate(fromFriday), to: toISODate(toFriday) };
}

/** Get the bounding Friday ISO dates for the current semester. */
export function getSemesterRange(): { from: string; to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let semesterStart: Date;
  let semesterEnd: Date;

  if (month <= 4) {
    // Spring: January - May
    semesterStart = new Date(year, 0, 1);
    semesterEnd = new Date(year, 4, 31);
  } else if (month >= 7) {
    // Fall: August - December
    semesterStart = new Date(year, 7, 1);
    semesterEnd = new Date(year, 11, 31);
  } else {
    // Summer: default to spring
    semesterStart = new Date(year, 0, 1);
    semesterEnd = new Date(year, 4, 31);
  }

  // Find first Friday >= semesterStart
  const fromFriday = new Date(semesterStart);
  while (fromFriday.getDay() !== 5) {
    fromFriday.setDate(fromFriday.getDate() + 1);
  }

  // Find last Friday <= semesterEnd
  const toFriday = new Date(semesterEnd);
  while (toFriday.getDay() !== 5) {
    toFriday.setDate(toFriday.getDate() - 1);
  }

  return { from: toISODate(fromFriday), to: toISODate(toFriday) };
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Format an ISO date string for display, e.g. "Fri Mar 6". */
export function formatPartyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${SHORT_DAYS[date.getDay()]} ${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Format an ISO date string as short date, e.g. "13 Feb". */
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
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
