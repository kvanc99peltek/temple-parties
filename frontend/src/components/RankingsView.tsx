'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DayTabs from './DayTabs';
import RankingCard from './RankingCard';
import EmptyState from './EmptyState';
import { PartyRanking } from '@/lib/types';
import { ratingsApi } from '@/services/api';
import { isRatingActive, isRatingLocked, getDefaultDay } from '@/utils/dateHelpers';
import useRatingStatus from '@/hooks/useRatingStatus';

interface RankingsViewProps {
  fridayDate: string;
  saturdayDate: string;
}

export default function RankingsView({ fridayDate, saturdayDate }: RankingsViewProps) {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>(getDefaultDay());
  const [rankings, setRankings] = useState<PartyRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserRating, submitRating } = useRatingStatus();

  // Fetch rankings
  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        const data = await ratingsApi.getRankings(selectedDay);
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [selectedDay]);

  const handleRate = useCallback(async (partyId: string, rating: number) => {
    await submitRating(partyId, rating);
    // Refresh rankings after rating
    try {
      const data = await ratingsApi.getRankings(selectedDay);
      setRankings(data);
    } catch (error) {
      console.error('Failed to refresh rankings:', error);
    }
  }, [selectedDay, submitRating]);

  // Merge localStorage ratings with server data
  const enrichedRankings = useMemo(() => {
    return rankings.map(party => ({
      ...party,
      userRating: getUserRating(party.id) ?? party.userRating,
    }));
  }, [rankings, getUserRating]);

  return (
    <div className="pb-20">
      <header className="bg-black pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
            RANKINGS
          </h1>
        </div>
      </header>

      <DayTabs
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        fridayDate={fridayDate}
        saturdayDate={saturdayDate}
      />

      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : enrichedRankings.length === 0 ? (
          <EmptyState selectedDay={selectedDay} />
        ) : (
          enrichedRankings.map((party, index) => (
            <RankingCard
              key={party.id}
              rank={index + 1}
              party={party}
              onRate={(rating) => handleRate(party.id, rating)}
              isActive={isRatingActive(party.doorsOpen, party.date)}
              isLocked={isRatingLocked(party.date)}
            />
          ))
        )}
      </div>
    </div>
  );
}
