'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import DayTabs from './DayTabs';
import RankingCard from './RankingCard';
import EmptyState from './EmptyState';
import ModalWrapper from './ModalWrapper';
import { PartyRanking } from '@/lib/types';
import { ratingsApi } from '@/services/api';
import { isRatingActive, isRatingLocked, getDefaultDay, getRankingsDates, getRankingsFridayISO } from '@/utils/dateHelpers';
import useRatingStatus from '@/hooks/useRatingStatus';

const PRIZE_LINK = 'https://www.instagram.com/reel/DVrFxFcgo1D/?igsh=MWNmbTcwbGUxNmFpeQ==';

export default function RankingsView() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>(getDefaultDay());
  const [rankings, setRankings] = useState<PartyRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const { getUserRating, submitRating } = useRatingStatus();

  const { friday: fridayDate, saturday: saturdayDate } = useMemo(() => getRankingsDates(), []);
  const rankingsFriday = useMemo(() => getRankingsFridayISO(), []);

  // Fetch rankings
  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        const data = await ratingsApi.getRankings(selectedDay, rankingsFriday);
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [selectedDay, rankingsFriday]);

  const handleRate = useCallback(async (partyId: string, rating: number) => {
    await submitRating(partyId, rating);
    // Refresh rankings after rating
    try {
      const data = await ratingsApi.getRankings(selectedDay, rankingsFriday);
      setRankings(data);
    } catch (error) {
      console.error('Failed to refresh rankings:', error);
    }
  }, [selectedDay, rankingsFriday, submitRating]);

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
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
            RANKINGS
          </h1>
          <div className="pr-5 flex items-center gap-3">
            <button
              onClick={() => setShowPrizeModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#FFD666] text-[#C69100] font-Montserrat font-bold text-base active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Win $50"
            >
              Win $50
            </button>
          </div>
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

      <ModalWrapper isOpen={showPrizeModal} onClose={() => setShowPrizeModal(false)} className="!p-0 overflow-hidden">
        <div className="p-8 pb-6">
          <h2 className="text-2xl font-montserrat font-semibold text-white mb-4">Win $50</h2>
          <p className="text-gray-300">
            We&apos;re doing a $50 giveaway to celebrate St. Patricks Day. You&apos;ll find the details on our Instagram below.
          </p>
        </div>
        <a
          href={PRIZE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 font-montserrat font-bold text-lg text-center text-[#C69100] bg-[#FFD666] hover:bg-[#FFE08A] transition-all duration-200 active:scale-[0.98]"
        >
          Take Me There
        </a>
      </ModalWrapper>
    </div>
  );
}
