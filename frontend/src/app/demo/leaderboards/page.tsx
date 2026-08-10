'use client';

import RankingsView from '@/components/RankingsView';
import AppShell from '@/components/AppShell';
import DemoBanner from '@/components/DemoBanner';
import { useDemoWeekend } from '@/hooks/useDemoWeekend';

export default function DemoLeaderboardsPage() {
  const demoWeekend = useDemoWeekend();

  return (
    <AppShell>
      <DemoBanner weekendOf={demoWeekend} />
      <RankingsView weekendOverride={demoWeekend} />
    </AppShell>
  );
}
