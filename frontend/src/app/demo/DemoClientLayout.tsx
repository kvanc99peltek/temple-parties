'use client';

import { DemoWeekendProvider } from '@/hooks/useDemoWeekend';

/**
 * Demo chrome: shared frozen weekend + noindex metadata (in sibling layout.tsx).
 * Pages under /demo/* are real routes (not view-swap).
 */
export default function DemoClientLayout({ children }: { children: React.ReactNode }) {
  return <DemoWeekendProvider>{children}</DemoWeekendProvider>;
}
