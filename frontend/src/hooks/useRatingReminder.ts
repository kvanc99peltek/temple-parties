'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Party } from '@/lib/types';
import { RATING_PROMPTS_STORAGE_KEY } from '@/lib/constants';
import { parseDoorsOpen, isRatingLocked } from '@/utils/dateHelpers';

interface RatingReminderParty {
  id: string;
  title: string;
  host: string;
  trigger: '1hr' | '2hr' | '12hr';
}

interface UseRatingReminderReturn {
  currentPrompt: RatingReminderParty | null;
  dismissPrompt: () => void;
}

function getDismissals(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(RATING_PROMPTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markDismissed(partyId: string, trigger: '1hr' | '2hr' | '12hr'): void {
  if (typeof window === 'undefined') return;
  const current = getDismissals();
  current[`${partyId}_${trigger}`] = true;
  localStorage.setItem(RATING_PROMPTS_STORAGE_KEY, JSON.stringify(current));
}

function isDismissed(partyId: string, trigger: '1hr' | '2hr' | '12hr'): boolean {
  return !!getDismissals()[`${partyId}_${trigger}`];
}

export default function useRatingReminder(
  allParties: Party[],
  goingParties: string[],
  getUserRating: (partyId: string) => number | null,
  isHydrated: boolean,
  isLoadingParties: boolean,
): UseRatingReminderReturn {
  const [queue, setQueue] = useState<RatingReminderParty[]>([]);
  const hasComputed = useRef(false);

  useEffect(() => {
    if (!isHydrated || isLoadingParties || hasComputed.current) return;
    if (allParties.length === 0 || goingParties.length === 0) return;

    hasComputed.current = true;
    const now = Date.now();
    const prompts: RatingReminderParty[] = [];

    for (const partyId of goingParties) {
      const party = allParties.find(p => p.id === partyId);
      if (!party) continue;

      if (isRatingLocked(party.date)) continue;
      if (getUserRating(partyId) !== null) continue;

      const doorsOpenDate = parseDoorsOpen(party.doorsOpen, party.date);
      const hoursSinceOpen = (now - doorsOpenDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceOpen >= 12) {
        if (!isDismissed(partyId, '12hr')) {
          prompts.push({ id: partyId, title: party.title, host: party.host, trigger: '12hr' });
        }
      } else if (hoursSinceOpen >= 2) {
        if (!isDismissed(partyId, '2hr')) {
          prompts.push({ id: partyId, title: party.title, host: party.host, trigger: '2hr' });
        }
      } else if (hoursSinceOpen >= 1) {
        if (!isDismissed(partyId, '1hr')) {
          prompts.push({ id: partyId, title: party.title, host: party.host, trigger: '1hr' });
        }
      }
    }

    setQueue(prompts);
  }, [isHydrated, isLoadingParties, allParties, goingParties, getUserRating]);

  const currentPrompt = queue.length > 0 ? queue[0] : null;

  const dismissPrompt = useCallback(() => {
    if (!currentPrompt) return;
    markDismissed(currentPrompt.id, currentPrompt.trigger);
    setQueue(prev => prev.slice(1));
  }, [currentPrompt]);

  return { currentPrompt, dismissPrompt };
}
