'use client';

import StarRating from './StarRating';
import { PartyRanking } from '@/lib/types';

interface RankingCardProps {
  rank: number;
  party: PartyRanking;
  onRate: (rating: number) => void;
  isActive: boolean;
  isLocked: boolean;
}

export default function RankingCard({
  rank,
  party,
  onRate,
  isActive,
  isLocked,
}: RankingCardProps) {
  return (
    <div className="bg-[#202023] rounded-2xl mb-3 overflow-hidden shadow-xl animate-slide-up-fade">
      <div className="p-5 sm:p-6">
        {/* Rank + Category */}
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <span className="text-2xl font-black text-[#FFD666] font-montserrat">
            #{rank}
          </span>
          <span className="inline-block px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase bg-[#08CA66] text-white rounded-full font-montserrat">
            {party.category}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight font-montserrat leading-none">
          {party.title}
        </h2>

        {/* Host */}
        <p className="text-white/50 text-sm mb-3 font-helvetica">
          <span className="font-normal">by </span>
          <span className="font-medium">{party.host}</span>
        </p>

        {/* Star Rating */}
        <StarRating
          rating={party.userRating}
          avgRating={party.avgRating}
          ratingCount={party.ratingCount}
          onRate={onRate}
          disabled={!isActive || isLocked}
          size="md"
        />

        {/* Status message */}
        {!isActive && !isLocked && (
          <p className="text-white/30 text-xs mt-2 font-helvetica">
            Rating opens at {party.doorsOpen}
          </p>
        )}
        {isLocked && (
          <p className="text-white/30 text-xs mt-2 font-helvetica">
            Rating period has ended
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-white/40 text-xs font-helvetica">
          <span>{party.goingCount} going</span>
          <span>{party.doorsOpen}</span>
        </div>
      </div>
    </div>
  );
}
