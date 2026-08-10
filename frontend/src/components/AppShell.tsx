'use client';

import BottomNav from '@/components/BottomNav';

/**
 * Attendee chrome: bottom/desktop nav around routed pages.
 * Auth/onboarding/admin/demo keep their own layouts (no shell).
 */
export default function AppShell({
  children,
  mapMode = false,
}: {
  children: React.ReactNode;
  /** Map needs a locked viewport height; other pages scroll. */
  mapMode?: boolean;
}) {
  return (
    <main
      className={`min-h-screen bg-black lg:pt-16 ${
        mapMode ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {children}
      <BottomNav />
    </main>
  );
}
