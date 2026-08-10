import type { User } from '@/lib/types';

/** Required to leave /onboarding (Epic 6.5 / 11.6 assumption). */
export function needsOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  return !user.username || !user.school_year;
}

export const SCHOOL_YEARS = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'graduate', label: 'Graduate' },
] as const;

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
