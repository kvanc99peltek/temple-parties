'use client';

import { useState, useCallback } from 'react';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import RatingModal from '@/components/RatingModal';
import Toast from '@/components/Toast';
import AppShell from '@/components/AppShell';
import DemoBanner from '@/components/DemoBanner';
import { getDefaultDay } from '@/utils/dateHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import { useDemoWeekend } from '@/hooks/useDemoWeekend';
import { trackEvent } from '@/utils/analytics';

export default function DemoMapPage() {
  const demoWeekend = useDemoWeekend();
  const [selectedDay] = useState<'friday' | 'saturday'>(() => getDefaultDay());
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus({ readOnly: true });
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus({ readOnly: true });
  const { revealAddress } = useAddressVisibility();
  const { allParties, topPartyIds, fridayDate, saturdayDate, isLoadingParties } = useParties(
    selectedDay,
    getCount,
    demoWeekend,
  );
  const toast = useToast();
  const showToast = toast.show;

  const handleGoingClick = useCallback(async (partyId: string) => {
    revealAddress(partyId);
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);
    trackEvent('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked', demo: true, source: 'map' });
  }, [toggleGoing, isGoing, revealAddress]);

  const handleNavigateClick = useCallback((partyId: string) => {
    revealAddress(partyId);
    void ensureGoing(partyId);
    trackEvent('navigate_clicked', { partyId, demo: true, source: 'map' });
  }, [ensureGoing, revealAddress]);

  const handleStarClick = useCallback((partyId: string, title: string, host: string, ratingActive: boolean, ratingLocked: boolean) => {
    if (!ratingActive) {
      showToast('Ratings unlock when doors open');
      return;
    }
    if (ratingLocked) {
      showToast('Ratings are now closed');
      return;
    }
    setRatingModalParty({ id: partyId, title, host });
  }, [showToast]);

  const handleModalRate = useCallback(async (rating: number) => {
    if (!ratingModalParty) return;
    await submitRating(ratingModalParty.id, rating);
    trackEvent('party_rated', { partyId: ratingModalParty.id, rating, source: 'map_modal', demo: true });
  }, [ratingModalParty, submitRating]);

  return (
    <AppShell mapMode>
      <div className="h-screen lg:h-[calc(100vh-4rem)] flex flex-col">
        <Header title="Party Map" />
        <DemoBanner weekendOf={demoWeekend} />
        <div className="flex-1 pb-16 lg:pb-0">
          {isLoadingParties ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : (
            <MapView
              parties={allParties}
              topPartyIds={topPartyIds}
              userGoingParties={goingParties}
              onGoingClick={handleGoingClick}
              onNavigateClick={handleNavigateClick}
              onRateClick={handleStarClick}
              fridayDate={fridayDate}
              saturdayDate={saturdayDate}
            />
          )}
        </div>
      </div>

      {ratingModalParty && (
        <RatingModal
          isOpen={!!ratingModalParty}
          onClose={() => setRatingModalParty(null)}
          partyTitle={ratingModalParty.title}
          partyHost={ratingModalParty.host}
          likePercentage={getLikePercentage(ratingModalParty.id, 0)}
          ratingCount={getRatingCount(ratingModalParty.id, 0)}
          userRating={getUserRating(ratingModalParty.id)}
          onRate={handleModalRate}
        />
      )}

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hide}
      />
    </AppShell>
  );
}
