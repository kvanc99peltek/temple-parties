'use client';

import { useState, useEffect } from 'react';
import RankingsView from '@/components/RankingsView';
import AppShell from '@/components/AppShell';
import PageSkeleton from '@/components/PageSkeleton';

export default function LeaderboardsPage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RankingsView />
    </AppShell>
  );
}
