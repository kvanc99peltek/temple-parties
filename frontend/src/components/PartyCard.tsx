'use client';

import GoingButton from './GoingButton';
import ThumbsRating from './ThumbsRating';
import { openMapsDirections } from '../utils/shareHelpers';
import { useEffect, useRef, useState } from 'react';

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
  onNavigateClick?: (partyId: string) => void | Promise<void>;
  isAddressVisible: boolean;
  onViewAddressClick: () => void;
  likePercentage: number;
  ratingCount: number;
  userRating: number | null;
  onRateClick: () => void;
  isRatingActive: boolean;
  isRatingLocked: boolean;
  isVerified: boolean;
  onVerifiedClick?: () => void;
  onHypedClick?: () => void;
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
  onGoingClick,
  onNavigateClick,
  isAddressVisible,
  onViewAddressClick,
  likePercentage,
  ratingCount,
  userRating,
  onRateClick,
  isRatingActive,
  isRatingLocked,
  isVerified,
  onVerifiedClick,
  onHypedClick,
}: PartyCardProps) {
  const prevVisibleRef = useRef(isAddressVisible);
  const [animateReveal, setAnimateReveal] = useState(false);

  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = isAddressVisible;
    if (!wasVisible && isAddressVisible) {
      setAnimateReveal(true);
      const t = window.setTimeout(() => setAnimateReveal(false), 450);
      return () => window.clearTimeout(t);
    }
  }, [isAddressVisible]);

  const handleNavigate = () => {
    if (onNavigateClick) {
      void onNavigateClick(id);
    }
    openMapsDirections(address);
  };

  return (
    <div className="bg-[#202023] rounded-t-2xl rounded-b-[12px] mb-3 sm:mb-4 overflow-hidden shadow-xl transition-all duration-200 hover:shadow-[#08CA66]/20 hover:-translate-y-1 animate-slide-up-fade">
      {/* Content area with padding */}
      <div className="p-5 sm:p-6">
        {/* Category Badge + HYPED */}
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <span className="inline-block px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase bg-[#08CA66] text-white rounded-full font-montserrat">
            {category}
          </span>
          {isVerified && (
            <button type="button" onClick={onVerifiedClick} className="appearance-none p-0 border-none bg-transparent">
              <span className="inline-block px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase bg-[#3B82F6] text-white rounded-full font-montserrat">
                VERIFIED
              </span>
            </button>
          )}
          {isHyped && (
            <button type="button" onClick={onHypedClick} className="appearance-none p-0 border-none bg-transparent">
              <span className="inline-block px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase bg-[#FFD666] text-black rounded-full shadow-gold-glow animate-pulse-glow font-montserrat">
                HYPED
              </span>
            </button>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2 tracking-tight font-montserrat leading-none">
          {title}
        </h2>

        {/* Host */}
        <p className="text-white/50 text-sm sm:text-base mb-1 font-helvetica">
          <span className="font-normal">by </span>
          <span className="font-medium">{host}</span>
        </p>

        {/* Address row */}
        <div className="mt-1">
          {!isAddressVisible ? (
            <button
              type="button"
              onClick={onViewAddressClick}
              className="text-white/40 text-sm font-helvetica underline underline-offset-4 hover:text-white/60 transition-colors"
            >
              View address
            </button>
          ) : (
            <div
              className={`flex items-center gap-4 text-white/50 text-sm font-helvetica font-normal ${
                animateReveal ? 'animate-fade-in' : ''
              }`}
            >
              <span>{address.split(',')[0]}</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{doorsOpen}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rating - tappable area opens rating modal */}
        <button
          type="button"
          onClick={onRateClick}
          className={`mt-2 ${!isRatingActive || isRatingLocked ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <ThumbsRating
            userRating={userRating}
            likePercentage={likePercentage}
            ratingCount={ratingCount}
            onRate={() => {}}
            disabled={!isRatingActive || isRatingLocked}
            size="sm"
          />
        </button>
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
          title="Opens in Google Maps"
          className="flex-1 h-[49px] rounded-br-[12px] rounded-tl-none rounded-tr-none rounded-bl-none font-bold text-lg uppercase bg-[#FFD666] text-black hover:opacity-90 active:scale-[0.98] transition-all duration-150 font-montserrat"
        >
          NAVIGATE
        </button>
      </div>
    </div>
  );
}
