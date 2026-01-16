'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import { getDefaultDay, getUpcomingDates } from '@/utils/dateHelpers';
import { shareContent, Party } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import partiesData from '@/data/parties.json';

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const { goingParties, isGoing, getCount, markAsGoing, hasAnyGoingParties } = useGoingStatus();

  // Get upcoming dates for tabs
  const { friday: fridayDate, saturday: saturdayDate } = useMemo(() => getUpcomingDates(), []);

  // Set default day on mount
  useEffect(() => {
    setSelectedDay(getDefaultDay());
    setIsHydrated(true);
  }, []);

  // Filter and sort parties for selected day
  const filteredParties = useMemo(() => {
    const parties = (partiesData as Party[])
      .filter(party => party.day === selectedDay)
      .map(party => ({
        ...party,
        goingCount: getCount(party.id, party.goingCount)
      }))
      .sort((a, b) => b.goingCount - a.goingCount);

    return parties;
  }, [selectedDay, getCount]);

  // Get the top party ID for HYPED badge
  const topPartyId = filteredParties.length > 0 ? filteredParties[0].id : null;

  // Get the top party that user is going to (for sharing)
  const topGoingParty = useMemo(() => {
    if (goingParties.length === 0) return null;

    const allParties = (partiesData as Party[]).map(party => ({
      ...party,
      goingCount: getCount(party.id, party.goingCount)
    }));

    const goingPartiesSorted = allParties
      .filter(party => goingParties.includes(party.id))
      .sort((a, b) => b.goingCount - a.goingCount);

    return goingPartiesSorted.length > 0 ? goingPartiesSorted[0] : null;
  }, [goingParties, getCount]);

  // Handle going button click
  const handleGoingClick = useCallback((partyId: string, currentCount: number) => {
    markAsGoing(partyId, currentCount);
    setShowModal(true);
  }, [markAsGoing]);

  // Handle share
  const handleShare = useCallback(async () => {
    const result = await shareContent(topGoingParty || undefined);

    if (result.success && result.method === 'clipboard') {
      setToastMessage('Link copied to clipboard!');
      setShowToast(true);
    }
  }, [topGoingParty]);

  // Handle day change
  const handleDayChange = useCallback((day: 'friday' | 'saturday') => {
    setSelectedDay(day);
  }, []);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-black">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-900/50" />
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="h-12 bg-gray-900/50 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black pb-8">
      <Header onShare={handleShare} hasGoingParties={hasAnyGoingParties} />

      <DayTabs
        selectedDay={selectedDay}
        onDayChange={handleDayChange}
        fridayDate={fridayDate}
        saturdayDate={saturdayDate}
      />

      {/* Party Cards */}
      <div className="max-w-2xl mx-auto px-4">
        {filteredParties.length === 0 ? (
          <EmptyState selectedDay={selectedDay} />
        ) : (
          filteredParties.map(party => (
            <PartyCard
              key={party.id}
              id={party.id}
              title={party.title}
              host={party.host}
              category={party.category}
              doorsOpen={party.doorsOpen}
              address={party.address}
              goingCount={party.goingCount}
              isHyped={party.id === topPartyId}
              userIsGoing={isGoing(party.id)}
              onGoingClick={() => handleGoingClick(party.id, party.goingCount)}
            />
          ))
        )}
        {/* Bottom border */}
        {filteredParties.length > 0 && <div className="border-t border-cherry-800" />}
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onShare={handleShare}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </main>
  );
}
