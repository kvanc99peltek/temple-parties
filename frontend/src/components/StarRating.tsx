'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number | null;
  avgRating: number;
  ratingCount: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  showUserRating?: boolean;
}

export default function StarRating({
  rating,
  avgRating,
  ratingCount,
  onRate,
  disabled = false,
  size = 'sm',
  showUserRating = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-sm';

  const isHovering = hoverRating > 0;
  const hasRated = rating !== null;
  const displayRating = isHovering
    ? hoverRating
    : showUserRating
      ? (rating || 0)
      : Math.round(avgRating);
  const fillColor = showUserRating
    ? '#FFD666'
    : (isHovering || hasRated) ? '#FFD666' : '#888';

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onRate(star)}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className={`transition-all duration-150 ${
              disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <svg
              className={starSize}
              viewBox="0 0 24 24"
              fill={star <= displayRating ? fillColor : 'none'}
              stroke={star <= displayRating ? fillColor : '#555'}
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        ))}
      </div>
      {size === 'sm' ? (
        <span className={`${textSize} text-white/40 font-helvetica`}>
          {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingCount})` : `(${ratingCount})`}
        </span>
      ) : (
        <span className={`${textSize} text-white/50 font-helvetica`}>
          {avgRating > 0 ? `${avgRating.toFixed(1)} (${ratingCount})` : 'No ratings yet'}
        </span>
      )}
    </div>
  );
}
