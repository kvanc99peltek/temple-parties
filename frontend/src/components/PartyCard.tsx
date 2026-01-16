'use client';

import GoingButton from './GoingButton';
import { openMapsDirections } from '../utils/shareHelpers';

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
}

export default function PartyCard({
  id,
  title,
  doorsOpen,
  address,
  goingCount,
  userIsGoing,
  onGoingClick
}: PartyCardProps) {
  const handleNavigate = () => {
    openMapsDirections(address);
  };

  return (
    <div className="border-t border-cherry-800 py-6">
      {/* Title */}
      <h2
        className="text-3xl font-bold text-white mb-2"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h2>

      {/* Address */}
      <p className="text-white text-lg mb-1">
        {address.split(',')[0]}
      </p>

      {/* Doors Open */}
      <p className="text-gray-400 text-lg italic mb-6">
        Doors Open {doorsOpen.toLowerCase()}
      </p>

      {/* Buttons Row */}
      <div className="flex gap-3">
        <GoingButton
          partyId={id}
          currentCount={goingCount}
          userIsGoing={userIsGoing}
          onGoingClick={onGoingClick}
        />
        <button
          onClick={handleNavigate}
          className="flex-1 py-3 px-6 rounded-full font-semibold text-sm border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-all duration-200"
        >
          Navigate
        </button>
      </div>
    </div>
  );
}
