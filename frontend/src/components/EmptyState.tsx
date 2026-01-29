'use client';

interface EmptyStateProps {
  selectedDay: 'friday' | 'saturday';
}

export default function EmptyState({ selectedDay }: EmptyStateProps) {
  const dayName = selectedDay === 'friday' ? 'Friday' : 'Saturday';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-12">
      {/* Icon */}
      <div className="mb-6 text-6xl opacity-50">
        🌙
      </div>

      {/* Message */}
      <h2 className="text-xl font-semibold text-gray-400 mb-2 text-center">
        No parties yet for {dayName}
      </h2>
      <p className="text-purple-500 text-center">
        Check back on Thursday for updates
      </p>
    </div>
  );
}
