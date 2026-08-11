'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { partiesApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface PartyCounts {
  [partyId: string]: number;
}

interface UseGoingStatusReturn {
  goingParties: string[];
  partyCounts: PartyCounts;
  isGoing: (partyId: string) => boolean;
  getCount: (partyId: string, fallbackCount: number | null) => number;
  toggleGoing: (partyId: string) => Promise<void>;
  ensureGoing: (partyId: string) => Promise<void>;
  hasAnyGoingParties: boolean;
  isLoading: boolean;
}

/**
 * Account-keyed RSVP state (Epic 7).
 *
 * Authed: load GET /parties/user/going; POST/DELETE to toggle; realtime counts.
 * Logged out: in-memory UI only — no anon API writes, no localStorage seed.
 * Demo readOnly: local UI flip without network.
 */
export function useGoingStatus(options?: { readOnly?: boolean }): UseGoingStatusReturn {
  const readOnly = options?.readOnly ?? false;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [goingParties, setGoingParties] = useState<string[]>([]);
  const [partyCounts, setPartyCounts] = useState<PartyCounts>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load account RSVPs when session is ready (not for demo/readOnly).
  useEffect(() => {
    if (readOnly || authLoading) return;

    if (!isAuthenticated) {
      setGoingParties([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ids = await partiesApi.getUserGoingParties();
        if (!cancelled) setGoingParties(ids);
      } catch (error) {
        console.error('Failed to load going parties:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, readOnly]);

  // Realtime going_count updates (skip demo).
  useEffect(() => {
    if (readOnly) return;

    const channel = supabase
      .channel('party-counts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parties',
        },
        (payload) => {
          const { id, going_count } = payload.new as { id: string; going_count: number };
          setPartyCounts((prev) => ({
            ...prev,
            [id]: going_count,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readOnly]);

  const isGoing = useCallback(
    (partyId: string): boolean => goingParties.includes(partyId),
    [goingParties]
  );

  const getCount = useCallback(
    (partyId: string, fallbackCount: number | null): number => {
      if (partyCounts[partyId] !== undefined) return partyCounts[partyId];
      return fallbackCount ?? 0;
    },
    [partyCounts]
  );

  const toggleGoing = useCallback(
    async (partyId: string): Promise<void> => {
      const wasGoing = goingParties.includes(partyId);
      const prevGoing = goingParties;

      // Optimistic UI
      const nextGoing = wasGoing
        ? goingParties.filter((id) => id !== partyId)
        : [...goingParties, partyId];
      setGoingParties(nextGoing);

      if (readOnly) return;

      // Soft-gate should redirect first; if still logged out, keep client-only.
      if (!isAuthenticated) return;

      setIsLoading(true);
      try {
        const result = await partiesApi.toggleGoing(partyId, wasGoing);
        setPartyCounts((prev) => ({
          ...prev,
          [partyId]: result.goingCount,
        }));
        // Align with server (idempotent response)
        setGoingParties((prev) => {
          const has = prev.includes(partyId);
          if (result.going && !has) return [...prev, partyId];
          if (!result.going && has) return prev.filter((id) => id !== partyId);
          return prev;
        });
      } catch (error) {
        console.error('Failed to toggle going status:', error);
        setGoingParties(prevGoing);
      } finally {
        setIsLoading(false);
      }
    },
    [goingParties, readOnly, isAuthenticated]
  );

  const ensureGoing = useCallback(
    async (partyId: string): Promise<void> => {
      if (goingParties.includes(partyId)) return;
      await toggleGoing(partyId);
    },
    [goingParties, toggleGoing]
  );

  return {
    goingParties,
    partyCounts,
    isGoing,
    getCount,
    toggleGoing,
    ensureGoing,
    hasAnyGoingParties: goingParties.length > 0,
    isLoading,
  };
}

export default useGoingStatus;
