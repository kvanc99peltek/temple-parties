'use client';

interface EmptyStateProps {
  selectedDay: 'friday' | 'saturday';
}

export default function EmptyState({ selectedDay }: EmptyStateProps) {
  const dayName = selectedDay === 'friday' ? 'Friday' : 'Saturday';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-12">
      {/* Message */}
      <h2 className="text-xl font-semibold text-gray-400 mb-2 text-center font-montserrat">
        No parties yet for {dayName}
      </h2>
      <p className="text-[#FA4693] text-center font-montserrat">
        Check back later for updates
      </p>
    </div>
  );
}
