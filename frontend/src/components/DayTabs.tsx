'use client';

interface DayTabsProps {
  selectedDay: 'friday' | 'saturday';
  onDayChange: (day: 'friday' | 'saturday') => void;
  fridayDate: string;
  saturdayDate: string;
}

export default function DayTabs({ selectedDay, onDayChange, fridayDate, saturdayDate }: DayTabsProps) {
  // fridayDate and saturdayDate are already just the day numbers (e.g., "21", "22")
  const fridayNum = fridayDate;
  const saturdayNum = saturdayDate;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex gap-2">
        <button
          onClick={() => onDayChange('friday')}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 font-black text-base sm:text-lg rounded-[14px] border border-white/25 transition-all duration-200 font-montserrat-alt ${
            selectedDay === 'friday'
              ? 'bg-[#FA4693] text-white'
              : 'bg-[#202023] text-white hover:bg-[#2A2A2D]'
          }`}
        >
          Fri {fridayNum}
        </button>
        <button
          onClick={() => onDayChange('saturday')}
          className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 font-black text-base sm:text-lg rounded-[14px] border border-white/25 transition-all duration-200 font-montserrat-alt ${
            selectedDay === 'saturday'
              ? 'bg-[#FA4693] text-white'
              : 'bg-[#202023] text-white hover:bg-[#2A2A2D]'
          }`}
        >
          SAT {saturdayNum}
        </button>
      </div>
    </div>
  );
}
