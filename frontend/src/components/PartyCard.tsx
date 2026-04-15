'use client';

import Image from 'next/image';
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
  posterImage?: string;
  onShowToast?: (message: string) => void;
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
  posterImage,
  onShowToast,
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
    <div className="flex gap-[2px] w-full mb-3 sm:mb-4 lg:mb-5 animate-slide-up-fade min-h-[200px] lg:min-h-[240px] bg-[rgba(40,40,40,0.5)] rounded-[12px] lg:rounded-[16px]">
      {/* Poster image (left side) */}
      <div className="relative w-[42%] shrink-0 rounded-[12px] lg:rounded-[16px] overflow-hidden bg-[rgba(40,40,40,0.5)]">
        {posterImage ? (
          <Image
            src={posterImage}
            alt={`${title} poster`}
            fill
            sizes="(max-width: 768px) 42vw, (max-width: 1024px) 30vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#b24bf3]/30 to-[#252525] flex items-center justify-center">
            <span className="text-white/20 font-montserrat font-bold text-2xl text-center px-2 leading-tight">
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Right side: info + going bar */}
      <div className="flex-1 flex flex-col bg-[rgba(40,40,40,0.9)] rounded-[12px] lg:rounded-[16px] min-w-0">
        {/* Info content */}
        <div className="flex-1 px-3 pt-[9px] pb-[10px] lg:px-5 lg:pt-4 lg:pb-4">
          {/* Pills row */}
          <div className="flex items-center justify-between mb-[6px]">
            <div className="flex gap-[3px] items-center">
              <span title="Party type" onClick={() => onShowToast?.('Party type')} className="inline-flex items-center justify-center px-2 py-[3px] lg:px-3 lg:py-1 bg-[#b24bf3] rounded-full cursor-pointer lg:cursor-default">
                <span className="font-helvetica font-medium text-[9px] lg:text-[11px] text-white uppercase leading-none whitespace-nowrap">
                  {category}
                </span>
              </span>
              {isHyped && (
                <span title="Most popular party this weekend" onClick={() => onShowToast?.('Most popular party this weekend')} className="inline-flex items-center justify-center px-2 py-[3px] lg:px-3 lg:py-1 bg-[#e0d4ff] rounded-full cursor-pointer lg:cursor-default">
                  <span className="font-helvetica font-medium text-[9px] lg:text-[11px] text-[#0b0b0b] uppercase leading-none">
                    HYPED
                  </span>
                </span>
              )}
            </div>
            {/* Bell icon — commented out for now
            <div className="relative w-3 h-3 shrink-0">
              <img src="/icons/bell.svg" alt="" className="w-3 h-3" />
              <img src="/icons/bell-dot.svg" alt="" className="absolute -top-0.5 -right-0.5 w-[5px] h-[5px]" />
            </div>
            */}
          </div>

          {/* Title */}
          <h2 className="font-montserrat font-bold text-[20px] leading-[22px] lg:text-[24px] lg:leading-[26px] text-white mb-[3px]">
            {title}
          </h2>

          {/* Host + Verified */}
          <div className="flex items-center mb-[10px] lg:mb-[14px]">
            <p className="font-montserrat text-[14px] leading-[18px] lg:text-[17px] lg:leading-[22px] text-white whitespace-nowrap overflow-hidden text-ellipsis">
              <span className="font-medium">by </span>
              <span className="font-semibold">{host}</span>
            </p>
            {isVerified && (
              <span title="Verified host" onClick={() => onShowToast?.('Verified host')} className="relative shrink-0 ml-0.5 w-[18px] h-[18px] inline-block cursor-pointer lg:cursor-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/verified-star.svg" alt="" className="absolute left-[3px] top-[3px] w-3 h-3" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/verified-check.svg" alt="" className="absolute left-[6px] top-[6.5px] w-[5.5px] h-[4.5px]" />
              </span>
            )}
          </div>

          {/* Deets: Time + Location */}
          <div className="flex flex-col gap-[3px] mb-[10px] lg:mb-[14px]">
            <div className="flex items-center gap-[3px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/clock.svg" alt="" className="w-[15px] h-[15px] lg:w-[18px] lg:h-[18px] shrink-0" />
              <span className="font-helvetica text-[12px] leading-[16px] lg:text-[15px] lg:leading-[20px] text-white/75">
                {doorsOpen}
              </span>
            </div>
            <div className="flex items-center gap-[3.8px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/map-pin.svg" alt="" className="w-[15px] h-[15px] lg:w-[18px] lg:h-[18px] shrink-0" />
              {!isAddressVisible ? (
                <button
                  type="button"
                  onClick={onViewAddressClick}
                  className="font-helvetica text-[12px] leading-[16px] lg:text-[15px] lg:leading-[20px] text-white/75 underline underline-offset-2 hover:text-white/90 transition-colors"
                >
                  View address
                </button>
              ) : (
                <span className={`font-helvetica text-[12px] leading-[16px] lg:text-[15px] lg:leading-[20px] text-white/75 truncate ${animateReveal ? 'animate-fade-in' : ''}`}>
                  {address.split(',')[0]}
                </span>
              )}
            </div>
          </div>

          {/* Like/Dislike */}
          <button
            type="button"
            onClick={onRateClick}
            title={!isRatingActive ? 'Ratings unlock when doors open' : isRatingLocked ? 'Ratings are now closed' : undefined}
            className={`${!isRatingActive || isRatingLocked ? 'cursor-default' : 'cursor-pointer'}`}
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

        {/* Going + Navigate bar */}
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
            className="flex-1 h-[41px] lg:h-[48px] rounded-br-[12px] lg:rounded-br-[16px] bg-[#e0d4ff] flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition-all duration-150"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/navigate.svg" alt="Navigate" className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
