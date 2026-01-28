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
    <div className="bg-[#202023] rounded-t-2xl rounded-b-[12px] mb-3 sm:mb-4 overflow-hidden shadow-xl transition-all duration-200 hover:shadow-[#FA4693]/20 hover:-translate-y-1 animate-slide-up-fade">
      {/* Content area with padding */}
      <div className="p-5 sm:p-6">
        {/* Category Badge + HYPED */}
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <span className="inline-block px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase bg-[#FA4693] text-white rounded-full font-montserrat-alt">
            {category}
          </span>
          {isHyped && (
            <span className="inline-block px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide bg-[#FFD666] text-black rounded-lg shadow-gold-glow animate-pulse-glow font-montserrat-alt">
              HYPED
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2 tracking-tight font-basement leading-none">
          {title}
        </h2>

        {/* Host */}
        <p className="text-white/50 text-sm sm:text-base mb-1 font-helvetica">
          <span className="font-normal">by </span>
          <span className="font-medium">{host}</span>
        </p>

        {/* Address + Time Row */}
        <div className="flex items-center gap-4 text-white/50 text-sm sm:text-sm font-helvetica font-normal">
          <span>{address.split(',')[0]}</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{doorsOpen}</span>
          </div>
        </div>
      </div>

      {/* Buttons Row - flush with card edges, no gap */}
      <div className="flex">
        <GoingButton
          partyId={id}
          currentCount={goingCount}
          userIsGoing={userIsGoing}
          onGoingClick={onGoingClick}
        />
        <button
          onClick={handleNavigate}
          className="flex-1 h-[49px] rounded-br-[12px] rounded-tl-none rounded-tr-none rounded-bl-none font-bold text-lg uppercase bg-[#FFD666] text-black hover:opacity-90 active:scale-[0.98] transition-all duration-150 font-montserrat"
        >
          NAVIGATE
        </button>
      </div>
    </div>
  );
}
