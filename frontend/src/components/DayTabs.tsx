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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex">
        <button
          onClick={() => onDayChange('friday')}
          className={`flex-1 py-4 px-6 font-bold text-xl transition-all duration-200 ${
            selectedDay === 'friday'
              ? 'bg-cherry-800 text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Fri {fridayNum}
        </button>
        <button
          onClick={() => onDayChange('saturday')}
          className={`flex-1 py-4 px-6 font-bold text-xl transition-all duration-200 ${
            selectedDay === 'saturday'
              ? 'bg-cherry-800 text-white'
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Sat {saturdayNum}
        </button>
      </div>
    </div>
  );
}
