'use client';

import { useState, useEffect, useCallback } from 'react';
import { ratingsApi } from '@/services/api';
import { RATING_STORAGE_KEY } from '@/lib/constants';

interface RatingState {
  [partyId: string]: number; // partyId -> user's rating (0 or 1)
}

interface LikePercentageState {
  [partyId: string]: { likePercentage: number; ratingCount: number };
}

interface UseRatingStatusReturn {
  getUserRating: (partyId: string) => number | null;
  getLikePercentage: (partyId: string, fallbackPct: number) => number;
  getRatingCount: (partyId: string, fallbackCount: number) => number;
  submitRating: (partyId: string, rating: number) => Promise<void>;
  isLoading: boolean;
}

const getLocalRatings = (): RatingState => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(RATING_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Migrate old 1-5 star ratings to binary 0/1
    let needsMigration = false;
    const migrated: RatingState = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && value > 1) {
        migrated[key] = value >= 3 ? 1 : 0;
        needsMigration = true;
      } else {
        migrated[key] = value as number;
      }
    }
    if (needsMigration) {
      localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return {};
  }
};

const setLocalRatings = (ratings: RatingState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(ratings));
};

export function useRatingStatus(options?: { readOnly?: boolean }): UseRatingStatusReturn {
  const readOnly = options?.readOnly ?? false;
  const [ratedParties, setRatedParties] = useState<RatingState>({});
  const [likePercentages, setLikePercentages] = useState<LikePercentageState>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load ratings from localStorage on mount
  useEffect(() => {
    setRatedParties(getLocalRatings());
  }, []);

  const getUserRating = useCallback((partyId: string): number | null => {
    return ratedParties[partyId] ?? null;
  }, [ratedParties]);

  const getLikePercentage = useCallback((partyId: string, fallbackPct: number): number => {
    return likePercentages[partyId]?.likePercentage ?? fallbackPct;
  }, [likePercentages]);

  const getRatingCount = useCallback((partyId: string, fallbackCount: number): number => {
    return likePercentages[partyId]?.ratingCount ?? fallbackCount;
  }, [likePercentages]);

  const submitRating = useCallback(async (partyId: string, rating: number): Promise<void> => {
    const currentRatings = getLocalRatings();
    setIsLoading(true);

    try {
      // Optimistic update
      const newRatings = { ...currentRatings, [partyId]: rating };
      setLocalRatings(newRatings);
      setRatedParties(newRatings);

      if (readOnly) return;

      const result = await ratingsApi.submitRating(partyId, rating);

      // Update like percentage from response
      setLikePercentages(prev => ({
        ...prev,
        [partyId]: { likePercentage: result.likePercentage, ratingCount: result.ratingCount },
      }));
    } catch (error) {
      console.error('Failed to submit rating:', error);
      // Revert on error
      setLocalRatings(currentRatings);
      setRatedParties(currentRatings);
    } finally {
      setIsLoading(false);
    }
  }, [readOnly]);

  return {
    getUserRating,
    getLikePercentage,
    getRatingCount,
    submitRating,
    isLoading,
  };
}

export default useRatingStatus;
