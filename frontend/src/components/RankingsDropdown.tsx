'use client';

import { useState, useRef, useEffect } from 'react';

export type RankingsFilter = 'last-week' | 'this-month' | 'this-semester' | 'by-hosts';

const FILTER_LABELS: Record<RankingsFilter, string> = {
  'last-week': 'Last Weekend',
  'this-month': 'This Month',
  'this-semester': 'This Semester',
  'by-hosts': 'By Hosts',
};

export const FILTER_OPTIONS: RankingsFilter[] = ['last-week', 'this-month', 'this-semester', 'by-hosts'];

/** Parse ?filter= from /leaderboards. Unknown values return null. */
export function parseRankingsFilter(raw: string | null | undefined): RankingsFilter | null {
  if (!raw) return null;
  return (FILTER_OPTIONS as readonly string[]).includes(raw) ? (raw as RankingsFilter) : null;
}

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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-3" ref={ref}>
      <div className="relative">
        {/* Trigger — same surface + hairline as the feed cards. */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-temple-surface-2 border border-white/10 rounded-[14px] font-montserrat font-bold text-base text-white transition-colors hover:border-white/20"
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
          <div className="absolute z-50 mt-2 w-full bg-temple-surface-2 border border-white/10 rounded-[14px] shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  onFilterChange(filter);
                  setIsOpen(false);
                }}
                className={`w-full text-left pl-12 pr-4 py-3.5 text-base font-montserrat font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'text-temple-purple bg-temple-purple/10'
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
