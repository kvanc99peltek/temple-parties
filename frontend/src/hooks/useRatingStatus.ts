'use client';

import { useState, useCallback } from 'react';
import { ratingsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface RatingState {
  [partyId: string]: number; // partyId -> user's rating (0 or 1)
}

interface LikePercentageState {
  [partyId: string]: { likePercentage: number; ratingCount: number };
}

interface UseRatingStatusReturn {
  getUserRating: (partyId: string) => number | null;
  getLikePercentage: (partyId: string, fallbackPct: number | null) => number;
  getRatingCount: (partyId: string, fallbackCount: number | null) => number;
  submitRating: (partyId: string, rating: number) => Promise<void>;
  isLoading: boolean;
}

/**
 * Account-keyed ratings (Epic 7).
 * No localStorage source of truth — in-memory after submit / API.
 * Demo readOnly: optimistic local only.
 */
export function useRatingStatus(options?: { readOnly?: boolean }): UseRatingStatusReturn {
  const readOnly = options?.readOnly ?? false;
  const { isAuthenticated } = useAuth();
  const [ratedParties, setRatedParties] = useState<RatingState>({});
  const [likePercentages, setLikePercentages] = useState<LikePercentageState>({});
  const [isLoading, setIsLoading] = useState(false);

  const getUserRating = useCallback(
    (partyId: string): number | null => ratedParties[partyId] ?? null,
    [ratedParties]
  );

  const getLikePercentage = useCallback(
    (partyId: string, fallbackPct: number | null): number => {
      return likePercentages[partyId]?.likePercentage ?? fallbackPct ?? 0;
    },
    [likePercentages]
  );

  const getRatingCount = useCallback(
    (partyId: string, fallbackCount: number | null): number => {
      return likePercentages[partyId]?.ratingCount ?? fallbackCount ?? 0;
    },
    [likePercentages]
  );

  const submitRating = useCallback(
    async (partyId: string, rating: number): Promise<void> => {
      const previous = ratedParties[partyId];
      setIsLoading(true);

      // Optimistic
      setRatedParties((prev) => ({ ...prev, [partyId]: rating }));

      if (readOnly) {
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated) {
        // Soft-gate should redirect first; if still logged out, keep client-only.
        setIsLoading(false);
        return;
      }

      try {
        const result = await ratingsApi.submitRating(partyId, rating);
        setLikePercentages((prev) => ({
          ...prev,
          [partyId]: {
            likePercentage: result.likePercentage,
            ratingCount: result.ratingCount,
          },
        }));
      } catch (error) {
        console.error('Failed to submit rating:', error);
        setRatedParties((prev) => {
          const next = { ...prev };
          if (previous === undefined) delete next[partyId];
          else next[partyId] = previous;
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [ratedParties, readOnly, isAuthenticated]
  );

  return {
    getUserRating,
    getLikePercentage,
    getRatingCount,
    submitRating,
    isLoading,
  };
}

export default useRatingStatus;
