'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { partiesApi } from '@/services/api';
import PageSkeleton from '@/components/PageSkeleton';

interface DemoWeekendContextValue {
  weekendOf: string;
}

const DemoWeekendContext = createContext<DemoWeekendContextValue | null>(null);

/**
 * Resolves the frozen demo weekend once for all /demo/* routes.
 * Children only render after the weekend key is known.
 */
export function DemoWeekendProvider({ children }: { children: React.ReactNode }) {
  const [weekendOf, setWeekendOf] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    partiesApi
      .getDemoWeekend()
      .then(({ weekendOf: key }) => {
        if (!cancelled) setWeekendOf(key);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!weekendOf) {
    return (
      <main className="min-h-screen bg-black lg:pt-16">
        <PageSkeleton />
        {error && (
          <div className="max-w-xl mx-auto px-4 py-8 text-center text-white/60">
            Could not load demo snapshot: {error}
          </div>
        )}
      </main>
    );
  }

  return (
    <DemoWeekendContext.Provider value={{ weekendOf }}>
      {children}
    </DemoWeekendContext.Provider>
  );
}

export function useDemoWeekend(): string {
  const ctx = useContext(DemoWeekendContext);
  if (!ctx) {
    throw new Error('useDemoWeekend must be used within DemoWeekendProvider');
  }
  return ctx.weekendOf;
}
