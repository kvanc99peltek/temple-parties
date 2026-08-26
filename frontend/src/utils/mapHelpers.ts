/**
 * Map helpers for "which pin should we show first?" (TUP-10).
 *
 * Headliner wins when we know it; otherwise the most-going party of that
 * night. Logged-out counts are null — those sort last so we never treat a
 * gated dash as a fake zero.
 */

import type { PartyDay } from '@/lib/types';

export type FeaturedPartyInput = {
  id: string;
  day: PartyDay;
  goingCount: number | null;
};

export type TopPartyIds = Record<PartyDay, string | null>;

export function pickFeaturedParty<T extends FeaturedPartyInput>(
  parties: T[],
  topPartyIds: TopPartyIds,
  day: PartyDay,
): T | null {
  const ofDay = parties.filter((p) => p.day === day);
  if (ofDay.length === 0) return null;

  const topId = topPartyIds[day];
  if (topId) {
    const headliner = ofDay.find((p) => p.id === topId);
    if (headliner) return headliner;
  }

  return ofDay.reduce((best, party) => {
    const count = party.goingCount ?? -1;
    const bestCount = best.goingCount ?? -1;
    return count > bestCount ? party : best;
  });
}
