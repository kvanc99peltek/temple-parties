'use client';

import { useState } from 'react';

interface GoingButtonProps {
  partyId: string;
  currentCount: number;
  userIsGoing: boolean;
  onGoingClick: () => void;
}

export default function GoingButton({ currentCount, userIsGoing, onGoingClick }: GoingButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (userIsGoing) return;

    setIsAnimating(true);
    onGoingClick();

    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <button
      onClick={handleClick}
      disabled={userIsGoing}
      className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 ${
        userIsGoing
          ? 'bg-emerald-500 text-white cursor-default shadow-lg shadow-emerald-500/40'
          : 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 active:scale-95'
      } ${isAnimating ? 'animate-going-click' : ''}`}
    >
      {userIsGoing && (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      )}
      {userIsGoing ? `I'm Going (${currentCount})` : `Going (${currentCount})`}
    </button>
  );
}
