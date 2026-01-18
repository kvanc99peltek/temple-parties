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
      className={`flex-1 py-3 px-6 rounded-full font-semibold text-sm transition-all duration-200 ${
        userIsGoing
          ? 'bg-yellow-500 text-black cursor-default'
          : 'bg-yellow-500 hover:bg-yellow-400 text-black'
      } ${isAnimating ? 'scale-105' : ''}`}
    >
      {currentCount} Going
    </button>
  );
}
