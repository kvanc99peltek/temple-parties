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
  getCount: (partyId: string, fallbackCount: number) => number;
  toggleGoing: (partyId: string) => Promise<void>;
  hasAnyGoingParties: boolean;
  isLoading: boolean;
}

/**
 * Custom hook to manage user's going status and party counts
 * Uses API for persistence and Supabase realtime for live updates
 */
export function useGoingStatus(): UseGoingStatusReturn {
  const { isAuthenticated } = useAuth();
  const [goingParties, setGoingParties] = useState<string[]>([]);
  const [partyCounts, setPartyCounts] = useState<PartyCounts>({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user's going parties on mount and when auth changes
  useEffect(() => {
    const fetchGoingParties = async () => {
      if (!isAuthenticated) {
        setGoingParties([]);
        return;
      }

      try {
        const parties = await partiesApi.getUserGoingParties();
        setGoingParties(parties);
      } catch (error) {
        console.error('Failed to fetch going parties:', error);
      }
    };

    fetchGoingParties();
  }, [isAuthenticated]);

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
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await partiesApi.toggleGoing(partyId);

      // Update local state immediately
      if (result.going) {
        setGoingParties(prev => [...prev, partyId]);
      } else {
        setGoingParties(prev => prev.filter(id => id !== partyId));
      }

      // Update count from response
      setPartyCounts(prev => ({
        ...prev,
        [partyId]: result.goingCount,
      }));
    } catch (error) {
      console.error('Failed to toggle going status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

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
