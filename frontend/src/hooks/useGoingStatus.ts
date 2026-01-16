'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStoredGoingParties, getStoredPartyCounts, addGoingParty, PartyCounts } from '../utils/storage';

interface UseGoingStatusReturn {
  goingParties: string[];
  partyCounts: PartyCounts;
  isGoing: (partyId: string) => boolean;
  getCount: (partyId: string, fallbackCount: number) => number;
  markAsGoing: (partyId: string, currentCount: number) => number;
  hasAnyGoingParties: boolean;
}

/**
 * Custom hook to manage user's going status and party counts
 * Handles localStorage sync and provides helper methods
 */
export function useGoingStatus(): UseGoingStatusReturn {
  const [goingParties, setGoingParties] = useState<string[]>([]);
  const [partyCounts, setPartyCounts] = useState<PartyCounts>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setGoingParties(getStoredGoingParties());
    setPartyCounts(getStoredPartyCounts());
    setIsHydrated(true);
  }, []);

  // Check if user is going to a specific party
  const isGoing = useCallback((partyId: string): boolean => {
    return goingParties.includes(partyId);
  }, [goingParties]);

  // Get count for a party (from state or fallback)
  const getCount = useCallback((partyId: string, fallbackCount: number): number => {
    return partyCounts[partyId] ?? fallbackCount;
  }, [partyCounts]);

  // Mark a party as going and increment count
  const markAsGoing = useCallback((partyId: string, currentCount: number): number => {
    // Check if already going (shouldn't happen, but safety check)
    if (goingParties.includes(partyId)) {
      return partyCounts[partyId] ?? currentCount;
    }

    // Update localStorage and get new count
    const { newCount } = addGoingParty(partyId, currentCount);

    // Update local state
    setGoingParties(prev => [...prev, partyId]);
    setPartyCounts(prev => ({ ...prev, [partyId]: newCount }));

    return newCount;
  }, [goingParties, partyCounts]);

  return {
    goingParties,
    partyCounts,
    isGoing,
    getCount,
    markAsGoing,
    hasAnyGoingParties: goingParties.length > 0
  };
}

export default useGoingStatus;
