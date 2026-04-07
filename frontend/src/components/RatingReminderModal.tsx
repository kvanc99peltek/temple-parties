'use client';

import { useState, useEffect } from 'react';
import ModalWrapper from './ModalWrapper';
import ThumbsRating from './ThumbsRating';

interface RatingReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyTitle: string;
  partyHost: string;
  likePercentage: number;
  ratingCount: number;
  userRating: number | null;
  onRate: (rating: number) => void;
  variant: 'tonight' | 'nextday';
}

export default function RatingReminderModal({
  isOpen,
  onClose,
  partyTitle,
  partyHost,
  likePercentage,
  ratingCount,
  userRating,
  onRate,
  variant,
}: RatingReminderModalProps) {
  const [submitted, setSubmitted] = useState(false);

  const estHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: 'numeric' }), 10);
  const tonightHeader = estHour >= 19 ? 'How is your night going?' : 'How is your day going?';

  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleRate = (rating: number) => {
    onRate(rating);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        {!submitted ? (
          <>
            <h3 className="text-xl font-bold text-white font-montserrat mb-2">
              {variant === 'nextday' ? "Rate Yesterday's Party" : tonightHeader}
            </h3>

            <p className="text-white/50 text-xs font-helvetica mb-4">
              Thank you for using tuparties.
            </p>

            <div className="mb-5">
              <p className="text-base font-bold text-[#b24bf3] font-montserrat">
                {partyTitle}
              </p>
              <p className="text-sm font-helvetica mt-0.5">
                <span className="text-white/40">by </span>
                <span className="text-white/60">{partyHost}</span>
              </p>
            </div>

            <div className="flex justify-center mb-4">
              <ThumbsRating
                userRating={userRating}
                likePercentage={likePercentage}
                ratingCount={ratingCount}
                onRate={handleRate}
                size="md"
              />
            </div>

            <p className="text-white/30 text-xs font-light font-helvetica">
              Did you enjoy this party?
            </p>
          </>
        ) : (
          <div className="py-4 animate-fade-in">
            <p className="text-2xl mb-2">Thanks!</p>
            <p className="text-white/50 text-sm font-helvetica">
              Rating Submitted!
            </p>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
