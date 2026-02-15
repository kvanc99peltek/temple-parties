'use client';

import { useState, useEffect } from 'react';
import ModalWrapper from './ModalWrapper';
import StarRating from './StarRating';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyTitle: string;
  partyHost: string;
  avgRating: number;
  ratingCount: number;
  userRating: number | null;
  onRate: (rating: number) => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  partyTitle,
  partyHost,
  avgRating,
  ratingCount,
  userRating,
  onRate,
}: RatingModalProps) {
  const [submitted, setSubmitted] = useState(false);

  // Reset submitted state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
    }
  }, [isOpen]);

  const handleRate = (rating: number) => {
    onRate(rating);
    setSubmitted(true);
    // Auto-close after brief delay
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="text-center">
        {!submitted ? (
          <>
            <h3 className="text-xl font-bold text-white font-montserrat mb-1">
              Rate This Party
            </h3>
            <p className="text-white/50 text-sm font-regular font-helvetica mb-6">
              {partyTitle} <span className="text-white/40">by</span> {partyHost}
            </p>

            <div className="flex justify-center mb-4">
              <StarRating
                rating={userRating}
                avgRating={avgRating}
                ratingCount={ratingCount}
                onRate={handleRate}
                size="md"
                showUserRating
              />
            </div>

            <p className="text-white/30 text-xs font-light font-helvetica">
              Tap a star to rate
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
