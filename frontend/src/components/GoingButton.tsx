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
    setIsAnimating(true);
    onGoingClick();

    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <button
      onClick={handleClick}
      title={userIsGoing ? 'Click to un-go' : 'Click to go'}
      className={`flex-1 h-[49px] rounded-bl-[12px] rounded-tl-none rounded-tr-none rounded-br-none font-bold text-lg uppercase transition-all duration-150 flex items-center justify-center gap-1.5 font-montserrat text-white hover:opacity-90 active:scale-[0.98] ${
        userIsGoing ? 'bg-gradient-to-r from-[#08CA6680] to-[#08CA66]' : 'bg-[#08CA66]'
      } ${isAnimating ? 'animate-going-click' : ''}`}
    >
      {userIsGoing && (
        <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
        </svg>
      )}
      GOING ({currentCount})
    </button>
  );
}
