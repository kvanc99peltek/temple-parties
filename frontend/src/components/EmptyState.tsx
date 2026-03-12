'use client';

interface EmptyStateProps {
  selectedDay: 'friday' | 'saturday';
  onGoToRankings?: () => void;
}

export default function EmptyState({ selectedDay, onGoToRankings }: EmptyStateProps) {
  const dayName = selectedDay === 'friday' ? 'Friday' : 'Saturday';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-12">
      {/* Message */}
      <h2 className="text-xl font-semibold text-gray-400 mb-2 text-center font-montserrat">
        No parties yet for {dayName}
      </h2>
      <p className="text-gray-500 text-sm text-center font-montserrat">
        Check back later for updates
      </p>
      {onGoToRankings && (
        <button
          onClick={onGoToRankings}
          className="text-[#08CA66] text-sm text-center font-montserrat mt-2 underline"
        >
          Check last week&apos;s rankings
        </button>
      )}
    </div>
  );
}
