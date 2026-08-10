'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import RatingModal from '@/components/RatingModal';
import Toast from '@/components/Toast';
import AppShell from '@/components/AppShell';
import PageSkeleton from '@/components/PageSkeleton';
import { getDefaultDay } from '@/utils/dateHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import { trackEvent } from '@/utils/analytics';

export default function MapPage() {
  const [selectedDay] = useState<'friday' | 'saturday'>(() => getDefaultDay());
  const [isHydrated, setIsHydrated] = useState(false);
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus();
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus();
  const { revealAddress } = useAddressVisibility();
  const { allParties, topPartyIds, fridayDate, saturdayDate, isLoadingParties } = useParties(selectedDay, getCount);
  const toast = useToast();
  const showToast = toast.show;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleGoingClick = useCallback(async (partyId: string) => {
    revealAddress(partyId);
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);
    trackEvent('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked', source: 'map' });
  }, [toggleGoing, isGoing, revealAddress]);

  const handleNavigateClick = useCallback((partyId: string) => {
    revealAddress(partyId);
    void ensureGoing(partyId);
    trackEvent('navigate_clicked', { partyId, source: 'map' });
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
    trackEvent('party_rated', { partyId: ratingModalParty.id, rating, source: 'map_modal' });
  }, [ratingModalParty, submitRating]);

  if (!isHydrated) {
    return (
      <AppShell mapMode>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell mapMode>
      <div className="h-screen lg:h-[calc(100vh-4rem)] flex flex-col">
        <Header title="Party Map" />
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
