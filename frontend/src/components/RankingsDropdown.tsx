'use client';

import { useState, useRef, useEffect } from 'react';

export type RankingsFilter = 'last-week' | 'this-month' | 'this-semester' | 'by-hosts';

const FILTER_LABELS: Record<RankingsFilter, string> = {
  'last-week': 'Last Weekend',
  'this-month': 'This Month',
  'this-semester': 'This Semester',
  'by-hosts': 'By Hosts',
};

const FILTER_OPTIONS: RankingsFilter[] = ['last-week', 'this-month', 'this-semester', 'by-hosts'];

interface RankingsDropdownProps {
  selectedFilter: RankingsFilter;
  onFilterChange: (filter: RankingsFilter) => void;
  onOpenChange?: (open: boolean) => void;
  onInfoClick?: () => void;
}

export default function RankingsDropdown({
  selectedFilter,
  onFilterChange,
  onOpenChange,
  onInfoClick,
}: RankingsDropdownProps) {
  const [isOpen, setIsOpenRaw] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const setIsOpen = (open: boolean) => {
    setIsOpenRaw(open);
    onOpenChange?.(open);
  };

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

  const displayLabel = FILTER_LABELS[selectedFilter];

  return (
    <div className="max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3" ref={ref}>
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-4 py-3 lg:px-5 lg:py-3.5 bg-[#202023] border border-white/10 rounded-2xl font-montserrat font-bold text-base lg:text-lg transition-colors hover:border-white/20 ${isOpen ? 'text-white' : 'text-white'}`}
        >
          <svg
            className={`w-5 h-5 lg:w-6 lg:h-6 transition-transform ${isOpen ? 'rotate-90 text-white' : 'text-white/40'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="flex-1 text-left">{displayLabel}</span>
          {onInfoClick && (
            <span
              role="button"
              tabIndex={0}
              aria-label="How ranking works"
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onInfoClick();
                }
              }}
              className="p-1 -m-1 rounded-full text-white/40 hover:text-white/80 transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5 lg:w-6 lg:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="11" x2="12" y2="16" strokeLinecap="round" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth={2} />
              </svg>
            </span>
          )}
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
                className={`w-full text-left pl-12 pr-4 py-3.5 lg:py-4 text-base lg:text-lg font-montserrat font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'text-[#b24bf3] bg-[#b24bf3]/10'
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
