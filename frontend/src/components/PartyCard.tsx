'use client';

import GoingButton from './GoingButton';
import { openMapsDirections } from '../utils/shareHelpers';

interface PartyCardProps {
  id: string;
  title: string;
  host: string;
  category: string;
  doorsOpen: string;
  address: string;
  goingCount: number;
  isHyped: boolean;
  userIsGoing: boolean;
  onGoingClick: () => void;
}

export default function PartyCard({
  id,
  title,
  host,
  category,
  doorsOpen,
  address,
  goingCount,
  isHyped,
  userIsGoing,
  onGoingClick
}: PartyCardProps) {
  const handleNavigate = () => {
    openMapsDirections(address);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 sm:p-5 mb-3 sm:mb-4 border border-zinc-800 shadow-xl transition-all duration-200 hover:border-purple-500/40 hover:shadow-purple-500/20 hover:-translate-y-1 animate-slide-up-fade">
      {/* Category Badge + HYPED */}
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <span className="inline-block px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase bg-purple-500/15 border border-purple-500/30 text-purple-500 rounded-full">
          {category}
        </span>
        {isHyped && (
          <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-lg shadow-gold-glow animate-pulse-glow">
            HYPED
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-1.5 sm:mb-2 tracking-tight font-georgia">
        {title}
      </h2>

      {/* Host */}
      <p className="text-gray-400 text-sm sm:text-base mb-2 sm:mb-3">
        Hosted by {host}
      </p>

      {/* Address */}
      <p className="text-gray-500 text-xs sm:text-sm mb-1.5 sm:mb-2">
        {address.split(',')[0]}
      </p>

      {/* Time Row */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Doors Open {doorsOpen}</span>
      </div>

      {/* Buttons Row */}
      <div className="flex gap-2 sm:gap-3">
        <GoingButton
          partyId={id}
          currentCount={goingCount}
          userIsGoing={userIsGoing}
          onGoingClick={onGoingClick}
        />
        <button
          onClick={handleNavigate}
          className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-sm sm:text-base border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black active:scale-95 transition-all duration-200"
        >
          Navigate
        </button>
      </div>
    </div>
  );
}
