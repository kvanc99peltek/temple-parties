'use client';

interface DayTabsProps {
  selectedDay: 'friday' | 'saturday';
  onDayChange: (day: 'friday' | 'saturday') => void;
  fridayDate: string;
  saturdayDate: string;
}

export default function DayTabs({ selectedDay, onDayChange, fridayDate, saturdayDate }: DayTabsProps) {
  return (
    <div className="max-w-xl mx-auto px-4 py-2">
      <div className="flex gap-[10px] justify-center">
        <button
          onClick={() => onDayChange('friday')}
          className={`w-[122px] h-[42px] rounded-[12px] font-montserrat font-semibold text-[16px] leading-[18px] transition-all duration-200 ${
            selectedDay === 'friday'
              ? 'bg-[#b24bf3] text-white'
              : 'bg-[#252525] text-white/75 hover:bg-[#303030]'
          }`}
        >
          Fri {fridayDate}
        </button>
        <button
          onClick={() => onDayChange('saturday')}
          className={`w-[122px] h-[42px] rounded-[12px] font-montserrat font-semibold text-[16px] leading-[18px] transition-all duration-200 ${
            selectedDay === 'saturday'
              ? 'bg-[#b24bf3] text-white'
              : 'bg-[#252525] text-white/75 hover:bg-[#303030]'
          }`}
        >
          Sat {saturdayDate}
        </button>
      </div>
    </div>
  );
}
