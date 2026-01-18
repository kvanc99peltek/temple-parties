'use client';

interface DayTabsProps {
  selectedDay: 'friday' | 'saturday';
  onDayChange: (day: 'friday' | 'saturday') => void;
  fridayDate: string;
  saturdayDate: string;
}

export default function DayTabs({ selectedDay, onDayChange, fridayDate, saturdayDate }: DayTabsProps) {
  // Extract just the day number from the date string (e.g., "1/17" -> "17")
  const fridayNum = fridayDate.split('/')[1];
  const saturdayNum = saturdayDate.split('/')[1];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex gap-2">
        <button
          onClick={() => onDayChange('friday')}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 font-semibold text-base sm:text-lg rounded-xl transition-all duration-200 font-georgia ${
            selectedDay === 'friday'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
              : 'bg-transparent text-gray-600 border border-zinc-800 hover:text-gray-400 hover:bg-purple-500/5'
          }`}
        >
          Fri {fridayNum}
        </button>
        <button
          onClick={() => onDayChange('saturday')}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 font-semibold text-base sm:text-lg rounded-xl transition-all duration-200 font-georgia ${
            selectedDay === 'saturday'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
              : 'bg-transparent text-gray-600 border border-zinc-800 hover:text-gray-400 hover:bg-purple-500/5'
          }`}
        >
          Sat {saturdayNum}
        </button>
      </div>
    </div>
  );
}
