import type { User } from '@/lib/types';

function onboardedStorageKey(userId: string): string {
  return `tuparties_onboarded:${userId}`;
}

/** Persist that this account already finished the required onboarding steps. */
export function writeOnboardingComplete(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(onboardedStorageKey(userId), '1');
  } catch {
    // private mode / quota — the in-memory profile is still the source of truth
  }
}

export function readOnboardingComplete(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(onboardedStorageKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** Required fields missing (Epic 6.5 / 11.6). Does not consult the completion latch. */
export function needsOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  return !user.username || !user.school_year;
}

/**
 * Whether to send the user through /onboarding.
 * Once they've finished (username + school year saved, or latched locally),
 * they only edit those fields from /profile — a flaky GET /profiles/me must
 * not reopen the flow.
 */
export function isOnboardingRequired(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.username && user.school_year) {
    writeOnboardingComplete(user.id);
    return false;
  }
  return !readOnboardingComplete(user.id);
}

/**
 * Graduation-year choices (owner call 2026-08-17: the field asks WHEN you
 * graduate, not what class standing you are — "Class of '28" is how people
 * actually talk). Computed from today's date so the list never goes stale:
 * this year through +6 covers December grads up to first-year grad students.
 * Stored value is the bare year string ("2028") — the backend accepts any
 * 4-digit year (legacy "junior"-style values from old accounts still save).
 */
export const GRAD_YEARS: { value: string; label: string }[] = Array.from(
  { length: 7 },
  (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: String(year), label: `Class of ${year}` };
  },
);

/**
 * Display label for a stored school_year value — "Class of 2028" for years,
 * capitalized passthrough ("Junior") for legacy class-standing values.
 */
export function schoolYearLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) return `Class of ${value}`;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,30}$/;

export type OnboardingStep =
  | 'school-year'
  | 'username'
  | 'avatar'
  | 'greek-life'
  | 'instagram';

/** FLOW 2 order from v2-sitemap.md */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  'school-year',
  'username',
  'avatar',
  'greek-life',
  'instagram',
];

export function firstIncompleteStep(user: User | null | undefined): OnboardingStep {
  if (!user?.school_year) return 'school-year';
  if (!user.username) return 'username';
  // Optional steps: if requireds are done, start at avatar so they can skip through.
  return 'avatar';
}
