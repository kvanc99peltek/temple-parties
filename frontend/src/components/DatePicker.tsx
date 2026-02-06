'use client';

import { useState, useMemo } from 'react';

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getNextFridayOrSaturday(): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 5=Fri, 6=Sat
  let daysToAdd: number;

  if (day === 5) {
    daysToAdd = 0; // Today is Friday
  } else if (day === 6) {
    daysToAdd = 0; // Today is Saturday
  } else {
    // Go forward to Friday
    daysToAdd = (5 - day + 7) % 7;
  }

  const target = new Date(today);
  target.setDate(today.getDate() + daysToAdd);
  return formatDateISO(target);
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayName = d.getDay() === 5 ? 'Friday' : 'Saturday';
  const monthName = MONTH_NAMES[d.getMonth()];
  return `${dayName}, ${monthName} ${d.getDate()}`;
}

export { getNextFridayOrSaturday };

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const selected = value || getNextFridayOrSaturday();

  // Parse selected to get initial month view
  const [selectedYear, selectedMonth] = selected.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth - 1); // 0-indexed
  const [isOpen, setIsOpen] = useState(false);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{ date: number; iso: string; isFriOrSat: boolean; isCurrentMonth: boolean }> = [];

    // Empty slots before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: 0, iso: '', isFriOrSat: false, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const dayOfWeek = dateObj.getDay();
      days.push({
        date: d,
        iso: formatDateISO(dateObj),
        isFriOrSat: dayOfWeek === 5 || dayOfWeek === 6,
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

  const handleSelect = (iso: string) => {
    onChange(iso);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-400 mb-1.5">
        Date <span className="text-red-400">*</span>
      </label>

      {/* Display button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left focus:border-[#FA4693] focus:ring-1 focus:ring-[#FA4693] outline-none transition-colors flex items-center justify-between"
      >
        <span>{formatDisplayDate(selected)}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <p className="text-gray-500 text-xs mt-1">Only Fridays and Saturdays can be selected</p>

      {/* Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-4">
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
            <span className="text-white font-medium text-sm">
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
                  d === 'Fri' || d === 'Sat' ? 'text-[#FA4693]/70' : 'text-gray-500'
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

              const isSelected = day.iso === selected;

              if (!day.isFriOrSat) {
                return (
                  <div
                    key={i}
                    className="h-8 flex items-center justify-center text-xs text-gray-600 rounded-lg"
                  >
                    {day.date}
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day.iso)}
                  className={`h-8 flex items-center justify-center text-xs rounded-lg font-medium transition-all ${
                    isSelected
                      ? 'bg-[#FA4693] text-white shadow-lg shadow-[#FA4693]/30'
                      : 'text-white hover:bg-zinc-700 bg-zinc-700/40'
                  }`}
                >
                  {day.date}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
