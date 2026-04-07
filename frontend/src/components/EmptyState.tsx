'use client';

interface EmptyStateProps {
  selectedDay?: 'friday' | 'saturday';
  message?: string;
  onGoToRankings?: () => void;
}

export default function EmptyState({ selectedDay, message, onGoToRankings }: EmptyStateProps) {
  const displayMessage = message
    ?? `No parties yet for ${selectedDay === 'friday' ? 'Friday' : 'Saturday'}`;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-12">
      {/* Message */}
      <h2 className="text-xl lg:text-2xl font-semibold text-gray-400 mb-2 text-center font-montserrat">
        {displayMessage}
      </h2>
      <p className="text-gray-500 text-sm lg:text-base text-center font-montserrat">
        Check back later for updates
      </p>
      {onGoToRankings && (
        <button
          onClick={onGoToRankings}
          className="text-[#b24bf3] text-sm lg:text-base text-center font-montserrat mt-2 underline"
        >
          Check this semester&apos;s leaderboards
        </button>
      )}
    </div>
  );
}
