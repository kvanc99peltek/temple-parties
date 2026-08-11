'use client';

import Image from 'next/image';
import Link from 'next/link';
import GoingButton from './GoingButton';
import ThumbsRating from './ThumbsRating';
import { openMapsDirections } from '../utils/shareHelpers';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

interface PartyCardProps {
  id: string;
  title: string;
  host: string;
  category: string;
  doorsOpen: string;
  address: string | null;
  goingCount: number | null;
  isHyped: boolean;
  userIsGoing: boolean;
  onGoingClick: (partyId: string) => void;
  onNavigateClick?: (partyId: string) => void | Promise<void>;
  isAddressVisible: boolean;
  onViewAddressClick: (partyId: string) => void;
  likePercentage: number;
  ratingCount: number;
  userRating: number | null;
  onRateClick: (partyId: string, title: string, host: string, ratingActive: boolean, ratingLocked: boolean) => void;
  isRatingActive: boolean;
  isRatingLocked: boolean;
  isVerified: boolean;
  posterImage?: string;
  onShowToast?: (message: string) => void;
}


function PartyCard({
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
    if (address) {
      openMapsDirections(address);
    }
  };

  const handleGoing = useCallback(() => onGoingClick(id), [onGoingClick, id]);
  const handleViewAddress = useCallback(() => onViewAddressClick(id), [onViewAddressClick, id]);
  const handleRate = useCallback(
    () => onRateClick(id, title, host, isRatingActive, isRatingLocked),
    [onRateClick, id, title, host, isRatingActive, isRatingLocked],
  );

  const displayCount = goingCount ?? 0;
  const streetLine = address ? address.split(',')[0] : null;
  const canShowAddress = isAddressVisible && !!streetLine;

  return (
    <div className="flex gap-[2px] w-full mb-3 sm:mb-4 lg:mb-5 animate-slide-up-fade min-h-[200px] lg:min-h-[240px] bg-[rgba(40,40,40,0.5)] rounded-[12px] lg:rounded-[16px]">
      <div className="relative w-[42%] shrink-0 rounded-[12px] lg:rounded-[16px] overflow-hidden bg-[rgba(40,40,40,0.5)]">
        <Link href={`/party/${id}`} className="absolute inset-0 z-[1]" aria-label={`View ${title}`}>
          <span className="sr-only">View party</span>
        </Link>
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

      <div className="flex-1 flex flex-col bg-[rgba(40,40,40,0.9)] rounded-[12px] lg:rounded-[16px] min-w-0">
        <div className="flex-1 px-3 pt-[9px] pb-[10px] lg:px-5 lg:pt-4 lg:pb-4">
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
          </div>

          <Link href={`/party/${id}`}>
            <h2 className="font-montserrat font-bold text-[20px] leading-[22px] lg:text-[24px] lg:leading-[26px] text-white mb-[3px] hover:text-white/90">
              {title}
            </h2>
          </Link>

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
              {!canShowAddress ? (
                <button
                  type="button"
                  onClick={handleViewAddress}
                  className="font-helvetica text-[12px] leading-[16px] lg:text-[15px] lg:leading-[20px] text-white/75 underline underline-offset-2 hover:text-white/90 transition-colors"
                >
                  {address === null ? 'Sign in to view address' : 'View address'}
                </button>
              ) : (
                <span className={`font-helvetica text-[12px] leading-[16px] lg:text-[15px] lg:leading-[20px] text-white/75 truncate ${animateReveal ? 'animate-fade-in' : ''}`}>
                  {streetLine}
                </span>
              )}
            </div>
          </div>

          {/* Single control opens modal — no nested buttons (§8.9) */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleRate}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRate();
              }
            }}
            title={!isRatingActive ? 'Ratings unlock when doors open' : isRatingLocked ? 'Ratings are now closed' : undefined}
            className={`${!isRatingActive || isRatingLocked ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <ThumbsRating
              userRating={userRating}
              likePercentage={likePercentage}
              ratingCount={ratingCount}
              onRate={() => {}}
              disabled
              size="sm"
              displayOnly
            />
          </div>
        </div>

        <div className="flex">
          <GoingButton
            partyId={id}
            currentCount={displayCount}
            userIsGoing={userIsGoing}
            onGoingClick={handleGoing}
          />
          <button
            type="button"
            onClick={handleNavigate}
            title="Opens walking directions"
            disabled={!address}
            className="flex-1 h-[41px] lg:h-[48px] rounded-br-[12px] lg:rounded-br-[16px] bg-[#e0d4ff] flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/navigate.svg" alt="Navigate" className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(PartyCard);
