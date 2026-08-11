'use client';

import { memo } from 'react';

interface ThumbsRatingProps {
  userRating: number | null;
  likePercentage: number;
  ratingCount: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** When true, render non-interactive visuals (no nested buttons). */
  displayOnly?: boolean;
}

function ThumbsRating({
  userRating,
  likePercentage,
  ratingCount,
  onRate,
  disabled = false,
  size = 'sm',
  displayOnly = false,
}: ThumbsRatingProps) {
  const likeCount = ratingCount > 0 ? Math.round((likePercentage / 100) * ratingCount) : 0;
  const dislikeCount = ratingCount - likeCount;

  const iconSize = size === 'sm' ? 'w-5 h-5 lg:w-6 lg:h-6' : 'w-7 h-7 lg:w-8 lg:h-8';
  const textSize = size === 'sm' ? 'text-[14px] lg:text-[17px]' : 'text-sm lg:text-base';

  const Up = displayOnly ? 'div' : 'button';
  const Down = displayOnly ? 'div' : 'button';

  return (
    <div className="flex items-center gap-[10px]">
      <Up
        {...(displayOnly
          ? {}
          : {
              type: 'button' as const,
              onClick: () => !disabled && onRate(1),
            })}
        className={`flex items-center gap-[3.8px] transition-all duration-150 ${
          disabled || displayOnly ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-110'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={userRating === 1 ? '/icons/thumbs-up-active.svg' : '/icons/thumbs-up.svg'}
          alt=""
          className={iconSize}
        />
        <span className={`${textSize} font-montserrat font-bold text-white uppercase`}>
          {likeCount}
        </span>
      </Up>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/divider.svg" alt="" className="h-3 lg:h-4 w-px" />

      <Down
        {...(displayOnly
          ? {}
          : {
              type: 'button' as const,
              onClick: () => !disabled && onRate(0),
            })}
        className={`flex items-center gap-[3.8px] transition-all duration-150 ${
          disabled || displayOnly ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-110'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={userRating === 0 ? '/icons/thumbs-down-active.svg' : '/icons/thumbs-up.svg'}
          alt=""
          className={`${iconSize} rotate-180`}
        />
        <span className={`${textSize} font-montserrat font-bold text-white uppercase`}>
          {dislikeCount}
        </span>
      </Down>
    </div>
  );
}

export default memo(ThumbsRating);
