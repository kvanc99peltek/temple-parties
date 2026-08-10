'use client';

import { useState, useEffect, useMemo } from 'react';
import RankingsDropdown, { RankingsFilter } from './RankingsDropdown';
import RankingRow from './RankingRow';
import HostRankingRow from './HostRankingRow';
import HostRankingInfoModal from './HostRankingInfoModal';
import EmptyState from './EmptyState';
import { PartyRanking, HostRanking } from '@/lib/types';
import { ratingsApi } from '@/services/api';
import { getLastWeekendFridayISO, getMonthRange, getSemesterRange } from '@/utils/dateHelpers';

type PartyMode = { mode: 'parties'; params: { weekendOf?: string; weekendFrom?: string; weekendTo?: string } };
type HostsMode = { mode: 'hosts' };
type FetchSpec = PartyMode | HostsMode;

interface RankingsViewProps {
  // When set, RankingsView ignores its own filter state and pins the parties
  // leaderboard to this single weekend. Used by /demo for a frozen snapshot.
  weekendOverride?: string;
}

export default function RankingsView({ weekendOverride }: RankingsViewProps = {}) {
  const [selectedFilter, setSelectedFilter] = useState<RankingsFilter>(
    weekendOverride ? 'last-week' : 'this-semester',
  );
  const [partyRankings, setPartyRankings] = useState<PartyRanking[]>([]);
  const [hostRankings, setHostRankings] = useState<HostRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const fetchSpec: FetchSpec = useMemo(() => {
    switch (selectedFilter) {
      case 'last-week':
        return { mode: 'parties', params: { weekendOf: weekendOverride ?? getLastWeekendFridayISO() } };
      case 'this-month': {
        const { from, to } = getMonthRange();
        return { mode: 'parties', params: { weekendFrom: from, weekendTo: to } };
      }
      case 'this-semester': {
        const { from, to } = getSemesterRange();
        return { mode: 'parties', params: { weekendFrom: from, weekendTo: to } };
      }
      case 'by-hosts':
        return { mode: 'hosts' };
    }
  }, [selectedFilter, weekendOverride]);

  useEffect(() => {
    let cancelled = false;

    const fetchRankings = async () => {
      setIsLoading(true);
      try {
        if (fetchSpec.mode === 'parties') {
          const data = await ratingsApi.getRankings(fetchSpec.params);
          if (!cancelled) setPartyRankings(data);
        } else {
          const data = await ratingsApi.getHostRankings();
          if (!cancelled) setHostRankings(data);
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchRankings();
    return () => { cancelled = true; };
  }, [fetchSpec]);

  // Push parties below rating threshold to the end
  const sortedPartyRankings = useMemo(() => {
    const rated = partyRankings.filter(p => p.ratingCount >= 5);
    const unrated = partyRankings.filter(p => p.ratingCount < 5);
    return [...rated, ...unrated];
  }, [partyRankings]);

  // Push ineligible hosts (<2 parties or <15 ratings) to the end, dimmed.
  const sortedHostRankings = useMemo(() => {
    const eligible = hostRankings.filter(h => h.isEligible);
    const ineligible = hostRankings.filter(h => !h.isEligible);
    return [...eligible, ...ineligible];
  }, [hostRankings]);

  const showHosts = fetchSpec.mode === 'hosts';
  const hasRows = showHosts ? sortedHostRankings.length > 0 : sortedPartyRankings.length > 0;

  return (
    <div className="pb-20 lg:pb-8">
      <header className="bg-black pt-10 pb-4 lg:hidden">
        <div className="max-w-xl lg:max-w-3xl mx-auto px-6 lg:px-8">
          <h1 className="text-[36px] leading-[27px] lg:text-[44px] lg:leading-[34px] font-normal text-white font-bitcount">
            Leaderboards
          </h1>
        </div>
      </header>

      <RankingsDropdown
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        onOpenChange={setIsDropdownOpen}
        onInfoClick={selectedFilter === 'by-hosts' ? () => setInfoOpen(true) : undefined}
      />


      <div className={`max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 transition-opacity duration-200 ${isDropdownOpen ? 'opacity-70' : 'opacity-100'}`}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : !hasRows ? (
          <EmptyState
            message={showHosts ? 'No ranked hosts yet' : 'No ranked parties for this period'}
            leaderboardsHref={null}
          />
        ) : (
          <div className="bg-[#202023] rounded-2xl overflow-hidden animate-slide-up-fade">
            {showHosts
              ? sortedHostRankings.map((host, index) => (
                  <HostRankingRow
                    key={host.hostCode}
                    rank={index + 1}
                    host={host}
                    isLast={index === sortedHostRankings.length - 1}
                    isBelowThreshold={!host.isEligible}
                  />
                ))
              : sortedPartyRankings.map((party, index) => (
                  <RankingRow
                    key={party.id}
                    rank={index + 1}
                    party={party}
                    isLast={index === sortedPartyRankings.length - 1}
                    isBelowThreshold={party.ratingCount < 5}
                  />
                ))}
          </div>
        )}
      </div>

      <HostRankingInfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
