'use client';

import { useState, useEffect, useCallback } from 'react';
import { ratingsApi } from '@/services/api';
import { RATING_STORAGE_KEY } from '@/lib/constants';

interface RatingState {
  [partyId: string]: number; // partyId -> user's rating (1-5)
}

interface AvgRatingState {
  [partyId: string]: { avgRating: number; ratingCount: number };
}

interface UseRatingStatusReturn {
  getUserRating: (partyId: string) => number | null;
  getAvgRating: (partyId: string, fallbackAvg: number) => number;
  getRatingCount: (partyId: string, fallbackCount: number) => number;
  submitRating: (partyId: string, rating: number) => Promise<void>;
  isLoading: boolean;
}

const getLocalRatings = (): RatingState => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(RATING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const setLocalRatings = (ratings: RatingState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(ratings));
};

export function useRatingStatus(): UseRatingStatusReturn {
  const [ratedParties, setRatedParties] = useState<RatingState>({});
  const [avgRatings, setAvgRatings] = useState<AvgRatingState>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load ratings from localStorage on mount
  useEffect(() => {
    setRatedParties(getLocalRatings());
  }, []);

  const getUserRating = useCallback((partyId: string): number | null => {
    return ratedParties[partyId] ?? null;
  }, [ratedParties]);

  const getAvgRating = useCallback((partyId: string, fallbackAvg: number): number => {
    return avgRatings[partyId]?.avgRating ?? fallbackAvg;
  }, [avgRatings]);

  const getRatingCount = useCallback((partyId: string, fallbackCount: number): number => {
    return avgRatings[partyId]?.ratingCount ?? fallbackCount;
  }, [avgRatings]);

  const submitRating = useCallback(async (partyId: string, rating: number): Promise<void> => {
    const currentRatings = getLocalRatings();
    setIsLoading(true);

    try {
      // Optimistic update
      const newRatings = { ...currentRatings, [partyId]: rating };
      setLocalRatings(newRatings);
      setRatedParties(newRatings);

      const result = await ratingsApi.submitRating(partyId, rating);

      // Update avg from response
      setAvgRatings(prev => ({
        ...prev,
        [partyId]: { avgRating: result.avgRating, ratingCount: result.ratingCount },
      }));
    } catch (error) {
      console.error('Failed to submit rating:', error);
      // Revert on error
      setLocalRatings(currentRatings);
      setRatedParties(currentRatings);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getUserRating,
    getAvgRating,
    getRatingCount,
    submitRating,
    isLoading,
  };
}

export default useRatingStatus;
