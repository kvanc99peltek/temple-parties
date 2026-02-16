import { useState, useEffect, useMemo } from 'react';
import { Party } from '@/lib/types';
import { partiesApi } from '@/services/api';

export default function useParties(selectedDay: 'friday' | 'saturday', getCount: (partyId: string, baseCount: number) => number, weekendOf?: string) {
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  // Fetch parties from API
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const data = await partiesApi.getParties(undefined, weekendOf);
        setParties(data);
      } catch (error) {
        console.error('Failed to fetch parties:', error);
      } finally {
        setIsLoadingParties(false);
      }
    };

    fetchParties();
  }, [weekendOf]);

  // Filter and sort parties for selected day
  const filteredParties = useMemo(() => {
    return parties
      .filter(party => party.day === selectedDay)
      .map(party => ({
        ...party,
        goingCount: getCount(party.id, party.goingCount)
      }))
      .sort((a, b) => b.goingCount - a.goingCount);
  }, [selectedDay, getCount, parties]);

  // Get ALL parties for map view (both days)
  const allParties = useMemo(() => {
    return parties.map(party => ({
      ...party,
      goingCount: getCount(party.id, party.goingCount)
    }));
  }, [getCount, parties]);

  // Get the top party ID for HYPED badge (per day)
  const topPartyId = filteredParties.length > 0 ? filteredParties[0].id : null;

  // Get top party IDs for each day (for map view)
  const topPartyIds = useMemo(() => {
    const fridayParties = allParties.filter(p => p.day === 'friday').sort((a, b) => b.goingCount - a.goingCount);
    const saturdayParties = allParties.filter(p => p.day === 'saturday').sort((a, b) => b.goingCount - a.goingCount);
    return {
      friday: fridayParties.length > 0 ? fridayParties[0].id : null,
      saturday: saturdayParties.length > 0 ? saturdayParties[0].id : null,
    };
  }, [allParties]);

  return { parties, filteredParties, allParties, topPartyId, topPartyIds, isLoadingParties };
}
