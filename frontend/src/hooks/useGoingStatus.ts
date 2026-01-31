'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { partiesApi } from '@/services/api';

interface PartyCounts {
  [partyId: string]: number;
}

interface UseGoingStatusReturn {
  goingParties: string[];
  partyCounts: PartyCounts;
  isGoing: (partyId: string) => boolean;
  getCount: (partyId: string, fallbackCount: number) => number;
  toggleGoing: (partyId: string) => Promise<void>;
  hasAnyGoingParties: boolean;
  isLoading: boolean;
}

// LocalStorage key for anonymous going parties
const STORAGE_KEY = 'temple_parties_going';

// Helper functions for localStorage
const getLocalGoingParties = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setLocalGoingParties = (parties: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parties));
};

/**
 * Custom hook to manage user's going status and party counts
 * Uses API for persistence and Supabase realtime for live updates
 * Supports anonymous users via localStorage
 */
export function useGoingStatus(): UseGoingStatusReturn {
  const [goingParties, setGoingParties] = useState<string[]>([]);
  const [partyCounts, setPartyCounts] = useState<PartyCounts>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load going parties from localStorage on mount
  useEffect(() => {
    setGoingParties(getLocalGoingParties());
  }, []);

  // Subscribe to realtime updates for party going counts
  useEffect(() => {
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
          setPartyCounts(prev => ({
            ...prev,
            [id]: going_count,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if user is going to a specific party
  const isGoing = useCallback((partyId: string): boolean => {
    return goingParties.includes(partyId);
  }, [goingParties]);

  // Get count for a party (from realtime state or fallback)
  const getCount = useCallback((partyId: string, fallbackCount: number): number => {
    return partyCounts[partyId] ?? fallbackCount;
  }, [partyCounts]);

  // Toggle going status for a party
  const toggleGoing = useCallback(async (partyId: string): Promise<void> => {
    // Check if already going
    const currentGoing = getLocalGoingParties();
    if (currentGoing.includes(partyId)) {
      // Already going - can't un-go
      return;
    }

    setIsLoading(true);
    try {
      // Add to going locally first (optimistic update)
      const newGoing = [...currentGoing, partyId];
      setLocalGoingParties(newGoing);
      setGoingParties(newGoing);

      // Call anonymous increment endpoint (works for all users)
      const result = await partiesApi.incrementGoingAnonymous(partyId);

      // Update count from response
      setPartyCounts(prev => ({
        ...prev,
        [partyId]: result.goingCount,
      }));
    } catch (error) {
      console.error('Failed to toggle going status:', error);
      // Revert local state on error
      const revertedGoing = getLocalGoingParties().filter(id => id !== partyId);
      setLocalGoingParties(revertedGoing);
      setGoingParties(revertedGoing);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    goingParties,
    partyCounts,
    isGoing,
    getCount,
    toggleGoing,
    hasAnyGoingParties: goingParties.length > 0,
    isLoading,
  };
}

export default useGoingStatus;
