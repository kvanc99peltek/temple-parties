import { useState, useEffect, useMemo, useCallback } from 'react';
import { Party, PartyDay, PARTY_DAYS } from '@/lib/types';
import { partiesApi } from '@/services/api';

/** Day-of-month string for DayTabs ("8") from an ISO date ("2025-08-08"). */
function dayOfMonth(iso: string): string {
  if (!iso) return '';
  const day = iso.split('-')[2];
  return day ? String(Number(day)) : '';
}

/**
 * Fetch approved parties for a weekend.
 * Omit `weekendOf` to let the backend pick the current weekend (authoritative).
 * Pass `weekendOf` for historical/demo snapshots.
 */
export default function useParties(
  selectedDay: PartyDay,
  getCount: (partyId: string, baseCount: number | null) => number,
  weekendOf?: string,
) {
  const [parties, setParties] = useState<Party[]>([]);
  const [weekendMeta, setWeekendMeta] = useState({
    weekendOf: '',
    thursdayDate: '',
    fridayDate: '',
    saturdayDate: '',
  });
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchParties = async () => {
      setIsLoadingParties(true);
      try {
        const data = await partiesApi.getParties(undefined, weekendOf);
        if (cancelled) return;
        setParties(data.parties);
        setWeekendMeta({
          weekendOf: data.weekendOf,
          thursdayDate: data.thursdayDate,
          fridayDate: data.fridayDate,
          saturdayDate: data.saturdayDate,
        });
      } catch (error) {
        console.error('Failed to fetch parties:', error);
      } finally {
        if (!cancelled) setIsLoadingParties(false);
      }
    };

    fetchParties();
    return () => {
      cancelled = true;
    };
  }, [weekendOf]);

  // Overlay the live going count on each party — but ONLY when the server
  // sent one. Logged-out viewers get null (the soft gate) and it must STAY
  // null so buttons/tiles show no number instead of a fake 0.
  const withLiveCount = useCallback(
    (party: Party): Party => ({
      ...party,
      goingCount: party.goingCount === null ? null : getCount(party.id, party.goingCount),
    }),
    [getCount],
  );

  const filteredParties = useMemo(() => {
    return parties
      .filter(party => party.day === selectedDay)
      .map(withLiveCount)
      .sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
  }, [selectedDay, withLiveCount, parties]);

  const allParties = useMemo(() => {
    return parties.map(withLiveCount);
  }, [withLiveCount, parties]);

  const topPartyId = filteredParties.length > 0 ? filteredParties[0].id : null;

  const topPartyIds = useMemo(() => {
    const ids = {} as Record<PartyDay, string | null>;
    for (const day of PARTY_DAYS) {
      const ofDay = allParties
        .filter(p => p.day === day)
        .sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
      ids[day] = ofDay.length > 0 ? ofDay[0].id : null;
    }
    return ids;
  }, [allParties]);

  const dayCounts = useMemo(() => {
    const counts = { thursday: 0, friday: 0, saturday: 0 };
    for (const party of parties) {
      if (party.day in counts) counts[party.day] += 1;
    }
    return counts;
  }, [parties]);

  return {
    parties,
    filteredParties,
    allParties,
    topPartyId,
    topPartyIds,
    isLoadingParties,
    dayCounts,
    fridayCount: dayCounts.friday,
    saturdayCount: dayCounts.saturday,
    weekendOf: weekendMeta.weekendOf,
    thursdayDate: dayOfMonth(weekendMeta.thursdayDate),
    fridayDate: dayOfMonth(weekendMeta.fridayDate),
    saturdayDate: dayOfMonth(weekendMeta.saturdayDate),
    thursdayDateISO: weekendMeta.thursdayDate,
    fridayDateISO: weekendMeta.fridayDate,
    saturdayDateISO: weekendMeta.saturdayDate,
  };
}
