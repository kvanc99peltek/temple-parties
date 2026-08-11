'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import RatingModal from '@/components/RatingModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import AppShell from '@/components/AppShell';
import DemoBanner from '@/components/DemoBanner';
import { getDefaultDay, isRatingActive, isRatingLocked } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import { useDemoWeekend } from '@/hooks/useDemoWeekend';
import { trackEvent } from '@/utils/analytics';

export default function DemoHomePage() {
  const demoWeekend = useDemoWeekend();
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);
  const [lastGoingPartyId, setLastGoingPartyId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus({ readOnly: true });
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus({ readOnly: true });
  const { isAddressVisible, revealAddress } = useAddressVisibility();
  const toast = useToast();
  const showToast = toast.show;

  const {
    filteredParties,
    allParties,
    topPartyId,
    isLoadingParties,
    fridayCount,
    saturdayCount,
    fridayDate,
    saturdayDate,
  } = useParties(selectedDay, getCount, demoWeekend);

  useEffect(() => {
    setSelectedDay(getDefaultDay());
  }, []);

  const hasAppliedSmartDefault = useRef(false);
  useEffect(() => {
    if (isLoadingParties || hasAppliedSmartDefault.current) return;
    hasAppliedSmartDefault.current = true;
    if (selectedDay === 'friday' && fridayCount === 0 && saturdayCount > 0) {
      setSelectedDay('saturday');
    } else if (selectedDay === 'saturday' && saturdayCount === 0 && fridayCount > 0) {
      setSelectedDay('friday');
    }
  }, [isLoadingParties, fridayCount, saturdayCount, selectedDay]);

  const topGoingParty = useMemo(() => {
    if (goingParties.length === 0) return null;
    const sorted = allParties
      .filter(p => goingParties.includes(p.id))
      .sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
    return sorted.length > 0 ? sorted[0] : null;
  }, [goingParties, allParties]);

  const handleGoingClick = useCallback(async (partyId: string) => {
    revealAddress(partyId);
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);
    trackEvent('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked', demo: true });
    if (!wasGoing) {
      setLastGoingPartyId(partyId);
      setShowInviteModal(true);
    }
  }, [toggleGoing, isGoing, revealAddress]);

  const handleNavigateClick = useCallback((partyId: string) => {
    revealAddress(partyId);
    void ensureGoing(partyId);
    trackEvent('navigate_clicked', { partyId, demo: true });
  }, [ensureGoing, revealAddress]);

  const handleShare = useCallback(async () => {
    const partyToShare = lastGoingPartyId
      ? allParties.find(p => p.id === lastGoingPartyId) ?? topGoingParty
      : topGoingParty;
    const result = await shareContent(partyToShare || undefined);
    trackEvent('party_shared', { method: result.method, success: result.success, partyId: partyToShare?.id, demo: true });
    if (result.success && result.method === 'clipboard') {
      showToast('Link copied to clipboard!');
    }
  }, [lastGoingPartyId, allParties, topGoingParty, showToast]);

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
    trackEvent('party_rated', { partyId: ratingModalParty.id, rating, source: 'modal', demo: true });
  }, [ratingModalParty, submitRating]);

  return (
    <AppShell>
      <div className="pb-20 lg:pb-8">
        <Header />
        <DemoBanner weekendOf={demoWeekend} />

        <DayTabs
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          fridayDate={fridayDate}
          saturdayDate={saturdayDate}
        />

        <div className="max-w-xl lg:max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoadingParties ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : filteredParties.length === 0 ? (
            <EmptyState
              selectedDay={selectedDay}
              leaderboardsHref="/demo/leaderboards"
            />
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
                onGoingClick={handleGoingClick}
                onNavigateClick={handleNavigateClick}
                isAddressVisible={isAddressVisible(party.id)}
                onViewAddressClick={revealAddress}
                likePercentage={getLikePercentage(party.id, party.likePercentage)}
                ratingCount={getRatingCount(party.id, party.ratingCount)}
                userRating={getUserRating(party.id)}
                onRateClick={handleStarClick}
                isRatingActive={party.ratingOpen ?? isRatingActive(party.doorsOpen, party.date)}
                isRatingLocked={party.ratingLocked ?? isRatingLocked(party.date)}
                isVerified={party.isVerified}
                posterImage={party.posterImage}
                onShowToast={showToast}
              />
            ))
          )}
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onShare={handleShare}
      />

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
