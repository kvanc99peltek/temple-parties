'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import HeadlinerCard from '@/components/HeadlinerCard';
import SectionLabel from '@/components/ui/SectionLabel';
import InviteModal from '@/components/InviteModal';
import RatingModal from '@/components/RatingModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import AppShell from '@/components/AppShell';
import DemoBanner from '@/components/DemoBanner';
import { getAlsoTonightLabel, getDefaultDay, isRatingActive, isRatingLocked, pickSmartDefaultDay } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import { useDemoWeekend } from '@/hooks/useDemoWeekend';
import { trackEvent } from '@/utils/analytics';
import type { PartyDay } from '@/lib/types';

export default function DemoHomePage() {
  const demoWeekend = useDemoWeekend();
  const [selectedDay, setSelectedDay] = useState<PartyDay>(() => getDefaultDay());
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
    dayCounts,
    thursdayDate,
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
    setSelectedDay(pickSmartDefaultDay(getDefaultDay(), dayCounts));
  }, [isLoadingParties, dayCounts]);

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

  const headliner = filteredParties.find(p => p.id === topPartyId) ?? filteredParties[0];
  const rest = headliner ? filteredParties.filter(p => p.id !== headliner.id) : [];
  const feedCardProps = (party: typeof filteredParties[number]) => ({
    id: party.id,
    title: party.title,
    host: party.host,
    category: party.category,
    doorsOpen: party.doorsOpen,
    address: party.address,
    goingCount: party.goingCount,
    isHyped: party.id === topPartyId,
    userIsGoing: isGoing(party.id),
    onGoingClick: handleGoingClick,
    onNavigateClick: handleNavigateClick,
    isAddressVisible: isAddressVisible(party.id),
    onViewAddressClick: revealAddress,
    // Demo parties always carry counts (the snapshot is public), but keep the
    // same null-through rule as the live feed for consistency.
    likePercentage: party.likePercentage === null ? null : getLikePercentage(party.id, party.likePercentage),
    ratingCount: party.ratingCount === null ? null : getRatingCount(party.id, party.ratingCount),
    userRating: getUserRating(party.id),
    onRateClick: handleStarClick,
    isRatingActive: party.ratingOpen ?? isRatingActive(party.doorsOpen, party.date),
    isRatingLocked: party.ratingLocked ?? isRatingLocked(party.date),
    isVerified: party.isVerified,
    posterImage: party.posterImage,
    onShowToast: showToast,
  });

  return (
    <AppShell>
      <div className="pb-24 lg:pb-8">
        <Header />
        <DemoBanner weekendOf={demoWeekend} />

        <DayTabs
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          thursdayDate={thursdayDate}
          fridayDate={fridayDate}
          saturdayDate={saturdayDate}
        />

        <div className="max-w-xl mx-auto px-4 sm:px-6">
          {isLoadingParties ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
            </div>
          ) : !headliner ? (
            <EmptyState
              selectedDay={selectedDay}
              leaderboardsHref="/demo/leaderboards"
            />
          ) : (
            <>
              <HeadlinerCard {...feedCardProps(headliner)} />
              {rest.length > 0 && (
                <>
                  <SectionLabel className="mb-3 mt-1">
                    {getAlsoTonightLabel(selectedDay, rest.length)}
                  </SectionLabel>
                  {rest.map(party => (
                    <PartyCard key={party.id} {...feedCardProps(party)} />
                  ))}
                </>
              )}
            </>
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
