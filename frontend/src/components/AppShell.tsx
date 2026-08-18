'use client';

import BottomNav from '@/components/BottomNav';

/**
 * Attendee chrome: bottom/desktop nav around routed pages.
 * Auth/onboarding/admin/demo keep their own layouts (no shell).
 *
 * hideBottomNav is for "pushed" routes like the party page: they trade the
 * mobile tab bar for a back arrow + their own sticky action bar. Desktop
 * keeps the top bar either way — big screens always have chrome to spare.
 */
export default function AppShell({
  children,
  mapMode = false,
  hideBottomNav = false,
}: {
  children: React.ReactNode;
  /** Map needs a locked viewport height; other pages scroll. */
  mapMode?: boolean;
  /** Suppress the mobile tab bar (party page renders a sticky action bar instead). */
  hideBottomNav?: boolean;
}) {
  return (
    <main
      className={`min-h-screen bg-black lg:pt-16 ${
        mapMode ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {children}
      <BottomNav desktopOnly={hideBottomNav} />
    </main>
  );
}
