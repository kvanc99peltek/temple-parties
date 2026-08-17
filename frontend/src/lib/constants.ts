// Z-index levels for consistent layering
export const Z_INDEX = {
  modal: 10000,
  toast: 10001,
  bottomNav: 9999,
  mapControls: 1000,
} as const;

// Toast duration in milliseconds
export const TOAST_DURATION = 3000;

// Debounce delay in milliseconds
export const DEBOUNCE_DELAY = 300;

// Temple University area bounds for coordinates
export const TEMPLE_BOUNDS = {
  minLat: 39.978,
  maxLat: 39.985,
  minLng: -75.162,
  maxLng: -75.148,
} as const;

// App URL for sharing
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tuparties.com';

// LocalStorage key for rating prompt dismissals
export const RATING_PROMPTS_STORAGE_KEY = 'temple_parties_rating_prompts';

// LocalStorage key for sponsor reminder dismissals
// export const SPONSOR_REMINDER_STORAGE_KEY = 'temple_parties_sponsor_reminder';
