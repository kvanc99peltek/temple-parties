'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import AddPartyModal from '@/components/AddPartyModal';
import RatingModal from '@/components/RatingModal';
import RatingReminderModal from '@/components/RatingReminderModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import AppShell from '@/components/AppShell';
import PageSkeleton from '@/components/PageSkeleton';
import RequireOnboarding from '@/components/RequireOnboarding';
import { getDefaultDay } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useModalState from '@/hooks/useModalState';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import useRatingReminder from '@/hooks/useRatingReminder';
import { partiesApi } from '@/services/api';
import { trackEvent } from '@/utils/analytics';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [isHydrated, setIsHydrated] = useState(false);
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);
  const [lastGoingPartyId, setLastGoingPartyId] = useState<string | null>(null);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus();
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus();
  const { isAddressVisible, revealAddress } = useAddressVisibility();
  const {
    filteredParties,
    allParties,
    topPartyId,
    isLoadingParties,
    fridayCount,
    saturdayCount,
    fridayDate,
    saturdayDate,
  } = useParties(selectedDay, getCount);
  const toast = useToast();
  const { currentPrompt, dismissPrompt } = useRatingReminder(
    allParties, goingParties, getUserRating, isHydrated, isLoadingParties,
  );
  const modals = useModalState(isAuthenticated, toggleGoing);
  const showToast = toast.show;
  const {
    openInviteModal,
    showInviteModal,
    closeInviteModal,
    showAddPartyModal,
    closeAddPartyModal,
    openLogin,
    requireAuthForGoing,
    requireAuthForRating,
    replayPendingAuthAction,
  } = modals;

  const replayedRef = useRef(false);
  useEffect(() => {
    if (authLoading || !isAuthenticated || replayedRef.current) return;
    replayedRef.current = true;
    void (async () => {
      const action = await replayPendingAuthAction();
      if (action?.type === 'going') {
        showToast("You're marked as going!");
      }
    })();
  }, [authLoading, isAuthenticated, replayPendingAuthAction, showToast]);

  useEffect(() => {
    setSelectedDay(getDefaultDay());
    setIsHydrated(true);
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

  const handleDayChange = useCallback((day: 'friday' | 'saturday') => {
    setSelectedDay(day);
    trackEvent('day_tab_switched', { day });
  }, []);

  const topGoingParty = (() => {
    if (goingParties.length === 0) return null;
    const goingPartiesSorted = allParties
      .filter(party => goingParties.includes(party.id))
      .sort((a, b) => (b.goingCount ?? 0) - (a.goingCount ?? 0));
    return goingPartiesSorted.length > 0 ? goingPartiesSorted[0] : null;
  })();

  const handleGoingClick = useCallback(async (partyId: string) => {
    if (requireAuthForGoing(partyId)) return;
    revealAddress(partyId);
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);
    trackEvent('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked' });
    if (!wasGoing) {
      setLastGoingPartyId(partyId);
      openInviteModal();
    }
  }, [toggleGoing, isGoing, openInviteModal, revealAddress, requireAuthForGoing]);

  const handleNavigateClick = useCallback((partyId: string) => {
    if (requireAuthForGoing(partyId)) return;
    revealAddress(partyId);
    void ensureGoing(partyId);
    trackEvent('navigate_clicked', { partyId });
  }, [ensureGoing, revealAddress, requireAuthForGoing]);

  const handleViewAddress = useCallback((partyId: string) => {
    const party = allParties.find((p) => p.id === partyId);
    if (party?.address == null && !isAuthenticated) {
      openLogin(undefined, '/');
      return;
    }
    revealAddress(partyId);
  }, [allParties, isAuthenticated, openLogin, revealAddress]);

  const handleShare = useCallback(async () => {
    const partyToShare = lastGoingPartyId
      ? allParties.find(p => p.id === lastGoingPartyId) ?? topGoingParty
      : topGoingParty;
    const result = await shareContent(partyToShare || undefined);
    trackEvent('party_shared', { method: result.method, success: result.success, partyId: partyToShare?.id });
    if (result.success && result.method === 'clipboard') {
      showToast('Link copied to clipboard!');
    }
  }, [lastGoingPartyId, allParties, topGoingParty, showToast]);

  const handleStarClick = useCallback((partyId: string, title: string, host: string, ratingActive: boolean, ratingLocked: boolean) => {
    if (requireAuthForRating()) return;
    if (!ratingActive) {
      showToast('Ratings unlock when doors open');
      return;
    }
    if (ratingLocked) {
      showToast('Ratings are now closed');
      return;
    }
    setRatingModalParty({ id: partyId, title, host });
  }, [showToast, requireAuthForRating]);

  const handleModalRate = useCallback(async (rating: number) => {
    if (!ratingModalParty) return;
    await submitRating(ratingModalParty.id, rating);
    trackEvent('party_rated', { partyId: ratingModalParty.id, rating, source: 'modal' });
  }, [ratingModalParty, submitRating]);

  const handleReminderRate = useCallback(async (rating: number) => {
    if (!currentPrompt) return;
    await submitRating(currentPrompt.id, rating);
    trackEvent('party_rated', { partyId: currentPrompt.id, rating, source: 'reminder' });
  }, [currentPrompt, submitRating]);

  const handlePartySubmit = useCallback(async (partyData: {
    title: string;
    host: string;
    pinLabel: string;
    address: string;
    doorsOpen: string;
    category: string;
    date: string;
  }) => {
    try {
      await partiesApi.createParty({
        title: partyData.title,
        host: partyData.host,
        pin_label: partyData.pinLabel,
        address: partyData.address,
        doors_open: partyData.doorsOpen,
        category: partyData.category,
        date: partyData.date,
      });
      trackEvent('party_created', { category: partyData.category });
      showToast('Party submitted for approval!');
    } catch {
      showToast('Failed to submit party');
    }
  }, [showToast]);

  if (!isHydrated) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <RequireOnboarding>
      <div className="pb-20 lg:pb-8">
        <Header />

        <DayTabs
          selectedDay={selectedDay}
          onDayChange={handleDayChange}
          fridayDate={fridayDate}
          saturdayDate={saturdayDate}
        />

        <div className="max-w-xl lg:max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoadingParties ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : filteredParties.length === 0 ? (
            <EmptyState selectedDay={selectedDay} />
          ) : (
            filteredParties.map((party, index) => (
              <div
                key={party.id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <PartyCard
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
                  onViewAddressClick={handleViewAddress}
                  likePercentage={getLikePercentage(party.id, party.likePercentage)}
                  ratingCount={getRatingCount(party.id, party.ratingCount)}
                  userRating={getUserRating(party.id)}
                  onRateClick={handleStarClick}
                  isRatingActive={party.ratingOpen ?? false}
                  isRatingLocked={party.ratingLocked ?? false}
                  isVerified={party.isVerified}
                  posterImage={party.posterImage}
                  onShowToast={showToast}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        onShare={handleShare}
      />

      <AddPartyModal
        isOpen={showAddPartyModal}
        onClose={closeAddPartyModal}
        onSubmit={handlePartySubmit}
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

      {currentPrompt && !ratingModalParty && (
        <RatingReminderModal
          isOpen={true}
          onClose={dismissPrompt}
          partyTitle={currentPrompt.title}
          partyHost={currentPrompt.host}
          likePercentage={getLikePercentage(currentPrompt.id, 0)}
          ratingCount={getRatingCount(currentPrompt.id, 0)}
          userRating={getUserRating(currentPrompt.id)}
          onRate={handleReminderRate}
          variant={currentPrompt.trigger === '12hr' ? 'nextday' : 'tonight'}
        />
      )}

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hide}
      />
      </RequireOnboarding>
    </AppShell>
  );
}
