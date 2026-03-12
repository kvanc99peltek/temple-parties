'use client';

import { useState, useRef, useEffect } from 'react';

export type RankingsFilter = 'last-week' | 'this-month' | 'this-semester' | 'custom';

const FILTER_LABELS: Record<RankingsFilter, string> = {
  'last-week': 'Last Weekend',
  'this-month': 'This Month',
  'this-semester': 'This Semester',
  'custom': 'Custom',
};

const FILTER_OPTIONS: RankingsFilter[] = ['last-week', 'this-month', 'this-semester', 'custom'];

interface RankingsDropdownProps {
  selectedFilter: RankingsFilter;
  onFilterChange: (filter: RankingsFilter) => void;
  customLabel?: string;
}

export default function RankingsDropdown({
  selectedFilter,
  onFilterChange,
  customLabel,
}: RankingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const displayLabel =
    selectedFilter === 'custom' && customLabel
      ? customLabel
      : FILTER_LABELS[selectedFilter];

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-3" ref={ref}>
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-[#202023] border border-white/10 rounded-2xl text-white font-montserrat font-bold text-base transition-colors hover:border-white/20"
        >
          <svg
            className={`w-5 h-5 text-white/40 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span>{displayLabel}</span>
        </button>

        {/* Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-[#202023] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  onFilterChange(filter);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-5 py-3.5 text-sm font-montserrat font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'text-[#08CA66] bg-[#08CA66]/10'
                    : 'text-white hover:bg-[#2A2A2D]'
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
