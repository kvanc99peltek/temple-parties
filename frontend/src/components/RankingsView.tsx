'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import RankingsDropdown, { RankingsFilter } from './RankingsDropdown';
import RankingsCalendarPicker from './RankingsCalendarPicker';
import RankingRow from './RankingRow';
import EmptyState from './EmptyState';
import { PartyRanking } from '@/lib/types';
import { ratingsApi } from '@/services/api';
import { getLastWeekendFridayISO, getMonthRange, getSemesterRange } from '@/utils/dateHelpers';

export default function RankingsView() {
  const [selectedFilter, setSelectedFilter] = useState<RankingsFilter>('this-semester');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [rankings, setRankings] = useState<PartyRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const apiParams = useMemo(() => {
    switch (selectedFilter) {
      case 'last-week':
        return { weekendOf: getLastWeekendFridayISO() };
      case 'this-month': {
        const { from, to } = getMonthRange();
        return { weekendFrom: from, weekendTo: to };
      }
      case 'this-semester': {
        const { from, to } = getSemesterRange();
        return { weekendFrom: from, weekendTo: to };
      }
      case 'custom':
        if (customStart && customEnd) {
          return { weekendFrom: customStart, weekendTo: customEnd };
        }
        return { weekendOf: getLastWeekendFridayISO() };
    }
  }, [selectedFilter, customStart, customEnd]);

  // Fetch rankings
  useEffect(() => {
    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        const data = await ratingsApi.getRankings(apiParams);
        setRankings(data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [apiParams]);

  const handleFilterChange = useCallback((filter: RankingsFilter) => {
    setSelectedFilter(filter);
    if (filter === 'custom') {
      setShowCalendar(true);
    } else {
      setShowCalendar(false);
    }
  }, []);

  const handleCustomRangeChange = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setShowCalendar(false);
  }, []);


  // Custom label for dropdown when range is set
  const customLabel = customStart && customEnd
    ? `${formatShort(customStart)} – ${formatShort(customEnd)}`
    : undefined;

  return (
    <div className="pb-20">
      <header className="bg-black pt-10 pb-4">
        <div className="max-w-xl mx-auto px-6">
          <h1 className="text-[36px] leading-[27px] font-normal text-white font-bitcount">
            Leaderboards
          </h1>
        </div>
      </header>

      <RankingsDropdown
        selectedFilter={selectedFilter}
        onFilterChange={handleFilterChange}
        customLabel={customLabel}
        onOpenChange={setIsDropdownOpen}
      />

      {showCalendar && (
        <div className="max-w-xl mx-auto px-4 sm:px-6 pb-4">
          <RankingsCalendarPicker
            startDate={customStart}
            endDate={customEnd}
            onRangeChange={handleCustomRangeChange}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      )}

      <div className={`max-w-xl mx-auto px-4 sm:px-6 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-70' : 'opacity-100'}`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : rankings.length === 0 ? (
          <EmptyState message="No ranked parties for this period" />
        ) : (
          <div className="bg-[#202023] rounded-2xl overflow-hidden animate-slide-up-fade">
            {rankings.map((party, index) => (
              <RankingRow
                key={party.id}
                rank={index + 1}
                party={party}
                isLast={index === rankings.length - 1}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function formatShort(iso: string): string {
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [, m, d] = iso.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}
