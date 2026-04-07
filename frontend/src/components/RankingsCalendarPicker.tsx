'use client';

import { useState, useMemo } from 'react';

interface RankingsCalendarPickerProps {
  startDate: string | null;
  endDate: string | null;
  onRangeChange: (start: string, end: string) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RankingsCalendarPicker({
  startDate,
  endDate,
  onRangeChange,
  onClose,
}: RankingsCalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [localStart, setLocalStart] = useState<string | null>(startDate);
  const [localEnd, setLocalEnd] = useState<string | null>(endDate);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      date: number;
      iso: string;
      dayOfWeek: number;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: 0, iso: '', dayOfWeek: -1, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      days.push({
        date: d,
        iso: formatDateISO(dateObj),
        dayOfWeek: dateObj.getDay(),
        isCurrentMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (iso: string) => {
    if (!localStart || (localStart && localEnd)) {
      // Start a new range
      setLocalStart(iso);
      setLocalEnd(null);
    } else {
      // Set end date
      if (iso < localStart) {
        // Clicked before start — make this the new start
        setLocalStart(iso);
        setLocalEnd(null);
      } else {
        setLocalEnd(iso);
      }
    }
  };

  const isInRange = (iso: string): boolean => {
    if (!localStart || !localEnd) return false;
    return iso >= localStart && iso <= localEnd;
  };

  const isStartOrEnd = (iso: string): boolean => {
    return iso === localStart || iso === localEnd;
  };

  // Get the corresponding Friday for a Saturday (one day back)
  const saturdayFridayInRange = (iso: string, dayOfWeek: number): boolean => {
    if (dayOfWeek !== 6) return false;
    // Check if the Friday before this Saturday is in range
    const [y, m, d] = iso.split('-').map(Number);
    const friday = new Date(y, m - 1, d - 1);
    const fridayIso = formatDateISO(friday);
    if (!localStart || !localEnd) {
      return fridayIso === localStart;
    }
    return fridayIso >= localStart && fridayIso <= localEnd;
  };

  const handleApply = () => {
    if (localStart && localEnd) {
      onRangeChange(localStart, localEnd);
    }
  };

  const handleClear = () => {
    setLocalStart(null);
    setLocalEnd(null);
  };

  return (
    <div className="bg-[#202023] border border-white/10 rounded-2xl p-4 animate-scale-in">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-700 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white font-medium text-sm font-montserrat">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1.5 rounded-lg hover:bg-zinc-700 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              d === 'Fri' ? 'text-[#b24bf3]/70' : d === 'Sat' ? 'text-[#b24bf3]/50' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (!day.isCurrentMonth) {
            return <div key={i} className="h-8" />;
          }

          const isFriday = day.dayOfWeek === 5;
          const isSaturday = day.dayOfWeek === 6;
          const inRange = isInRange(day.iso);
          const isEndpoint = isStartOrEnd(day.iso);
          const satInRange = saturdayFridayInRange(day.iso, day.dayOfWeek);

          // Only Fridays are clickable
          if (isFriday) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(day.iso)}
                className={`h-8 flex items-center justify-center text-xs rounded-lg font-medium transition-all ${
                  isEndpoint
                    ? 'bg-[#b24bf3] text-white shadow-lg shadow-[#b24bf3]/30'
                    : inRange
                    ? 'bg-[#b24bf3]/20 text-[#b24bf3] hover:bg-[#b24bf3]/30'
                    : 'text-white hover:bg-zinc-700 bg-zinc-700/40'
                }`}
              >
                {day.date}
              </button>
            );
          }

          if (isSaturday) {
            return (
              <div
                key={i}
                className={`h-8 flex items-center justify-center text-xs rounded-lg ${
                  satInRange || inRange
                    ? 'bg-[#b24bf3]/10 text-[#b24bf3]/60'
                    : 'text-gray-600'
                }`}
              >
                {day.date}
              </div>
            );
          }

          // Non Fri/Sat
          return (
            <div
              key={i}
              className="h-8 flex items-center justify-center text-xs text-gray-600 rounded-lg"
            >
              {day.date}
            </div>
          );
        })}
      </div>

      {/* Selection info + buttons */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
        <div className="text-xs text-white/40 font-montserrat font-medium">
          {localStart && localEnd
            ? `${formatShort(localStart)} – ${formatShort(localEnd)}`
            : localStart
            ? `${formatShort(localStart)} – pick end`
            : 'Pick a start weekend'}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { handleClear(); onClose(); }}
            className="text-white/50 text-xs font-montserrat font-medium hover:text-white/70 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!localStart || !localEnd}
            className="px-4 py-1.5 bg-[#b24bf3] text-white text-xs font-montserrat font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#9b3dd4] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function formatShort(iso: string): string {
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, m, d] = iso.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}
