import { useState, useEffect, useMemo } from 'react';
import { Party } from '@/lib/types';
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
  selectedDay: 'friday' | 'saturday',
  getCount: (partyId: string, baseCount: number | null) => number,
  weekendOf?: string,
) {
  const [parties, setParties] = useState<Party[]>([]);
  const [weekendMeta, setWeekendMeta] = useState({
    weekendOf: '',
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

  const filteredParties = useMemo(() => {
    return parties
      .filter(party => party.day === selectedDay)
      .map(party => ({
        ...party,
        goingCount: getCount(party.id, party.goingCount),
      }))
      .sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
  }, [selectedDay, getCount, parties]);

  const allParties = useMemo(() => {
    return parties.map(party => ({
      ...party,
      goingCount: getCount(party.id, party.goingCount),
    }));
  }, [getCount, parties]);

  const topPartyId = filteredParties.length > 0 ? filteredParties[0].id : null;

  const topPartyIds = useMemo(() => {
    const fridayParties = allParties.filter(p => p.day === 'friday').sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
    const saturdayParties = allParties.filter(p => p.day === 'saturday').sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
    return {
      friday: fridayParties.length > 0 ? fridayParties[0].id : null,
      saturday: saturdayParties.length > 0 ? saturdayParties[0].id : null,
    };
  }, [allParties]);

  const fridayCount = useMemo(() => parties.filter(p => p.day === 'friday').length, [parties]);
  const saturdayCount = useMemo(() => parties.filter(p => p.day === 'saturday').length, [parties]);

  // DayTabs expects day-of-month labels; prefer server ISO dates when present.
  const fridayTabDate = dayOfMonth(weekendMeta.fridayDate);
  const saturdayTabDate = dayOfMonth(weekendMeta.saturdayDate);

  return {
    parties,
    filteredParties,
    allParties,
    topPartyId,
    topPartyIds,
    isLoadingParties,
    fridayCount,
    saturdayCount,
    weekendOf: weekendMeta.weekendOf,
    fridayDate: fridayTabDate,
    saturdayDate: saturdayTabDate,
    fridayDateISO: weekendMeta.fridayDate,
    saturdayDateISO: weekendMeta.saturdayDate,
  };
}
