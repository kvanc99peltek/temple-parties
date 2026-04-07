'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import AddPartyModal from '@/components/AddPartyModal';
import RatingModal from '@/components/RatingModal';
import RatingReminderModal from '@/components/RatingReminderModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MapView from '@/components/MapView';
import RankingsView from '@/components/RankingsView';
import { getDefaultDay, getUpcomingDates, getUpcomingFridayISO, isRatingActive, isRatingLocked } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useModalState from '@/hooks/useModalState';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import useRatingReminder from '@/hooks/useRatingReminder';
import useSponsorReminder from '@/hooks/useSponsorReminder';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import SponsorBanner from '@/components/SponsorBanner';
import SponsorReminderModal from '@/components/SponsorReminderModal';
import { PRIMARY_SPONSOR } from '@/lib/sponsors';
import { openMapsDirections } from '@/utils/shareHelpers';
import { partiesApi } from '@/services/api';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [currentView, setCurrentView] = useState<'home' | 'map' | 'rankings'>('home');
  const [isHydrated, setIsHydrated] = useState(false);
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);
  const [lastGoingPartyId, setLastGoingPartyId] = useState<string | null>(null);
  const [sponsorFocus, setSponsorFocus] = useState<{ lat: number; lng: number; sponsorId: string } | null>(null);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus();
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus();
  // Launch-mode: auth + profile UI hidden.
  const isAuthenticated = false;
  const { isAddressVisible, revealAddress } = useAddressVisibility();
  const upcomingFriday = useMemo(() => getUpcomingFridayISO(), []);
  const { filteredParties, allParties, topPartyId, topPartyIds, isLoadingParties, fridayCount, saturdayCount } = useParties(selectedDay, getCount, upcomingFriday);
  const toast = useToast();
  const { currentPrompt, dismissPrompt } = useRatingReminder(
    allParties, goingParties, getUserRating, isHydrated, isLoadingParties,
  );
  const { showSponsorReminder, dismissSponsorReminder } = useSponsorReminder(isHydrated);
  const modals = useModalState(isAuthenticated, toggleGoing);
  const showToast = toast.show;
  const {
    openInviteModal,
    showInviteModal,
    closeInviteModal,
    showAddPartyModal,
    closeAddPartyModal,
  } = modals;

  // Get upcoming dates for tabs
  const { friday: fridayDate, saturday: saturdayDate } = useMemo(() => getUpcomingDates(), []);

  // Set default day on mount
  useEffect(() => {
    setSelectedDay(getDefaultDay());
    setIsHydrated(true);
    track('view_changed', { from: null, to: 'home' });
    posthog.capture('view_changed', { from: null, to: 'home' });
  }, []);

  // Smart default: switch to the other day if the default day has no parties
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

  // Get the top party that user is going to (for sharing)
  const topGoingParty = useMemo(() => {
    if (goingParties.length === 0) return null;

    const goingPartiesSorted = allParties
      .filter(party => goingParties.includes(party.id))
      .sort((a, b) => b.goingCount - a.goingCount);

    return goingPartiesSorted.length > 0 ? goingPartiesSorted[0] : null;
  }, [goingParties, allParties]);

  // Handle going button click
  const handleGoingClick = useCallback(async (partyId: string) => {
    revealAddress(partyId);
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);

    track('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked' });
    posthog.capture('going_toggled', { partyId, action: wasGoing ? 'unmarked' : 'marked' });

    // Show invite modal when marking as going (not un-going)
    if (!wasGoing) {
      setLastGoingPartyId(partyId);
      openInviteModal();
    }
  }, [toggleGoing, isGoing, openInviteModal, revealAddress]);

  const handleNavigateClick = useCallback((partyId: string) => {
    // Fire-and-forget: don't block navigation.
    revealAddress(partyId);
    void ensureGoing(partyId);
    track('navigate_clicked', { partyId });
    posthog.capture('navigate_clicked', { partyId });
  }, [ensureGoing, revealAddress]);

  // Handle share
  const handleShare = useCallback(async () => {
    const partyToShare = lastGoingPartyId
      ? allParties.find(p => p.id === lastGoingPartyId) ?? topGoingParty
      : topGoingParty;
    const result = await shareContent(partyToShare || undefined);

    track('party_shared', { method: result.method, success: result.success, partyId: partyToShare?.id });
    posthog.capture('party_shared', { method: result.method, success: result.success, partyId: partyToShare?.id });

    if (result.success && result.method === 'clipboard') {
      showToast('Link copied to clipboard!');
    }
  }, [lastGoingPartyId, allParties, topGoingParty, showToast]);

  // Handle day change
  const handleDayChange = useCallback((day: 'friday' | 'saturday') => {
    setSelectedDay(day);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((view: 'home' | 'map' | 'rankings') => {
    track('view_changed', { from: currentView, to: view });
    posthog.capture('view_changed', { from: currentView, to: view });
    setCurrentView(view);
  }, [currentView]);

  // Handle sponsor banner click
  const handleSponsorBannerClick = useCallback(() => {
    setSponsorFocus({
      lat: PRIMARY_SPONSOR.latitude,
      lng: PRIMARY_SPONSOR.longitude,
      sponsorId: PRIMARY_SPONSOR.id,
    });
    setCurrentView('map');
    track('sponsor_banner_clicked', { sponsor: PRIMARY_SPONSOR.id });
    posthog.capture('sponsor_banner_clicked', { sponsor: PRIMARY_SPONSOR.id });
  }, []);

  // Handle sponsor reminder navigate
  const handleSponsorReminderNavigate = useCallback(() => {
    openMapsDirections(PRIMARY_SPONSOR.address);
    track('sponsor_reminder_navigate', { sponsor: PRIMARY_SPONSOR.id });
    posthog.capture('sponsor_reminder_navigate', { sponsor: PRIMARY_SPONSOR.id });
  }, []);

  // Handle sponsor reminder dismiss
  const handleSponsorReminderDismiss = useCallback(() => {
    dismissSponsorReminder();
    track('sponsor_reminder_dismissed', { sponsor: PRIMARY_SPONSOR.id });
    posthog.capture('sponsor_reminder_dismissed', { sponsor: PRIMARY_SPONSOR.id });
  }, [dismissSponsorReminder]);

  useSwipeNavigation(currentView, handleViewChange);

  // Handle star click — show toast if not yet active, open rating modal otherwise
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

  // Handle rating submission from modal
  const handleModalRate = useCallback(async (rating: number) => {
    if (!ratingModalParty) return;
    await submitRating(ratingModalParty.id, rating);
    track('party_rated', { partyId: ratingModalParty.id, rating, source: 'modal' });
    posthog.capture('party_rated', { partyId: ratingModalParty.id, rating, source: 'modal' });
  }, [ratingModalParty, submitRating]);

  // Handle rating submission from reminder popup
  const handleReminderRate = useCallback(async (rating: number) => {
    if (!currentPrompt) return;
    await submitRating(currentPrompt.id, rating);
    track('party_rated', { partyId: currentPrompt.id, rating, source: 'reminder' });
    posthog.capture('party_rated', { partyId: currentPrompt.id, rating, source: 'reminder' });
  }, [currentPrompt, submitRating]);

  // Handle party submission
  const handlePartySubmit = useCallback(async (partyData: { title: string; host: string; pinLabel: string; address: string; doorsOpen: string; category: string; date: string }) => {
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

      track('party_created', { category: partyData.category });
      posthog.capture('party_created', { category: partyData.category });
      showToast('Party submitted for approval!');
    } catch {
      showToast('Failed to submit party');
    }
  }, [showToast]);

  // Prevent hydration mismatch by not rendering until client-side
  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-black">
        <div className="animate-pulse">
          <div className="h-16 bg-zinc-900/50" />
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-4">
            <div className="h-12 bg-zinc-900/50 rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      {currentView === 'home' ? (
        // Home View (List)
        <div className="pb-20">
          <Header />

          <DayTabs
            selectedDay={selectedDay}
            onDayChange={handleDayChange}
            fridayDate={fridayDate}
            saturdayDate={saturdayDate}
          />

          <SponsorBanner
            text={PRIMARY_SPONSOR.bannerText}
            sponsorName={PRIMARY_SPONSOR.name}
            onClick={handleSponsorBannerClick}
          />

          {/* Party Cards */}
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            {isLoadingParties ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : filteredParties.length === 0 ? (
              <EmptyState selectedDay={selectedDay} onGoToRankings={() => setCurrentView('rankings')} />
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
                  onGoingClick={() => handleGoingClick(party.id)}
                  onNavigateClick={handleNavigateClick}
                  isAddressVisible={isAddressVisible(party.id)}
                  onViewAddressClick={() => revealAddress(party.id)}
                  likePercentage={getLikePercentage(party.id, party.likePercentage)}
                  ratingCount={getRatingCount(party.id, party.ratingCount)}
                  userRating={getUserRating(party.id)}
                  onRateClick={() => handleStarClick(party.id, party.title, party.host, isRatingActive(party.doorsOpen, party.date), isRatingLocked(party.date))}
                  isRatingActive={isRatingActive(party.doorsOpen, party.date)}
                  isRatingLocked={isRatingLocked(party.date)}
                  isVerified={party.isVerified}
                  posterImage={party.posterImage}
                />
              ))
            )}
          </div>
        </div>
      ) : currentView === 'map' ? (
        // Map View (Full Screen)
        <div className="h-screen flex flex-col">
          <Header title="Party Map" />
          <div className="flex-1 pb-16">
            <MapView
              parties={allParties}
              topPartyIds={topPartyIds}
              userGoingParties={goingParties}
              onGoingClick={handleGoingClick}
              onNavigateClick={handleNavigateClick}
              onRateClick={handleStarClick}
              fridayDate={fridayDate}
              saturdayDate={saturdayDate}
              sponsorFocus={sponsorFocus}
              onSponsorFocusConsumed={() => setSponsorFocus(null)}
            />
          </div>
        </div>
      ) : (
        // Rankings View
        <RankingsView />
      )}

      {/* Bottom Navigation */}
      <BottomNav activeView={currentView} onViewChange={handleViewChange} />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={closeInviteModal}
        onShare={handleShare}
      />

      {/* Add Party Modal */}
      <AddPartyModal
        isOpen={showAddPartyModal}
        onClose={closeAddPartyModal}
        onSubmit={handlePartySubmit}
      />

      {/* Rating Modal */}
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

      {/* Sponsor Reminder Modal — priority over rating reminder */}
      {showSponsorReminder && !ratingModalParty && (
        <SponsorReminderModal
          isOpen={true}
          onClose={handleSponsorReminderDismiss}
          sponsorName={PRIMARY_SPONSOR.name}
          onNavigate={handleSponsorReminderNavigate}
        />
      )}

      {/* Rating Reminder Popup — suppressed while sponsor modal is showing */}
      {currentPrompt && !ratingModalParty && !showSponsorReminder && (
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

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hide}
      />
    </main>
  );
}
