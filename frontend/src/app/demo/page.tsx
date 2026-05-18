'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import RatingModal from '@/components/RatingModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MapView from '@/components/MapView';
import RankingsView from '@/components/RankingsView';
import DemoBanner from '@/components/DemoBanner';
import { isRatingActive, isRatingLocked } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useAddressVisibility from '@/hooks/useAddressVisibility';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { partiesApi } from '@/services/api';
import { trackEvent } from '@/utils/analytics';

function getWeekendDates(weekendOf: string): { friday: string; saturday: string } {
  const [y, m, d] = weekendOf.split('-').map(Number);
  const friday = new Date(y, m - 1, d);
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  return {
    friday: String(friday.getDate()),
    saturday: String(saturday.getDate()),
  };
}

export default function DemoPage() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [currentView, setCurrentView] = useState<'home' | 'map' | 'rankings'>('home');
  const [ratingModalParty, setRatingModalParty] = useState<{ id: string; title: string; host: string } | null>(null);
  const [lastGoingPartyId, setLastGoingPartyId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [demoWeekend, setDemoWeekend] = useState<string | null>(null);
  const [demoWeekendError, setDemoWeekendError] = useState<string | null>(null);

  const { goingParties, isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus({ readOnly: true });
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus({ readOnly: true });
  const { isAddressVisible, revealAddress } = useAddressVisibility();
  const toast = useToast();
  const showToast = toast.show;

  // Resolve the demo weekend once.
  useEffect(() => {
    let cancelled = false;
    partiesApi
      .getDemoWeekend()
      .then(({ weekendOf }) => {
        if (!cancelled) setDemoWeekend(weekendOf);
      })
      .catch((err: Error) => {
        if (!cancelled) setDemoWeekendError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { filteredParties, allParties, topPartyId, topPartyIds, isLoadingParties, fridayCount, saturdayCount } =
    useParties(selectedDay, getCount, demoWeekend ?? undefined);

  // Switch to the day that has parties if the default is empty.
  useEffect(() => {
    if (isLoadingParties || !demoWeekend) return;
    if (selectedDay === 'friday' && fridayCount === 0 && saturdayCount > 0) {
      setSelectedDay('saturday');
    } else if (selectedDay === 'saturday' && saturdayCount === 0 && fridayCount > 0) {
      setSelectedDay('friday');
    }
  }, [isLoadingParties, fridayCount, saturdayCount, selectedDay, demoWeekend]);

  const { friday: fridayDate, saturday: saturdayDate } = useMemo(
    () => (demoWeekend ? getWeekendDates(demoWeekend) : { friday: '', saturday: '' }),
    [demoWeekend],
  );

  const topGoingParty = useMemo(() => {
    if (goingParties.length === 0) return null;
    const sorted = allParties
      .filter(p => goingParties.includes(p.id))
      .sort((a, b) => b.goingCount - a.goingCount);
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

  const handleDayChange = useCallback((day: 'friday' | 'saturday') => {
    setSelectedDay(day);
  }, []);

  const handleViewChange = useCallback((view: 'home' | 'map' | 'rankings') => {
    trackEvent('view_changed', { from: currentView, to: view, demo: true });
    setCurrentView(view);
  }, [currentView]);

  useSwipeNavigation(currentView, handleViewChange);

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

  // Render skeleton while resolving the demo weekend.
  if (!demoWeekend) {
    return (
      <main className="min-h-screen bg-black lg:pt-16">
        <div className="animate-pulse">
          <div className="h-16 bg-zinc-900/50" />
          <div className="max-w-xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="h-12 bg-zinc-900/50 rounded-xl" />
          </div>
        </div>
        {demoWeekendError && (
          <div className="max-w-xl mx-auto px-4 py-8 text-center text-white/60">
            Could not load demo snapshot: {demoWeekendError}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-black lg:pt-16 ${currentView === 'map' ? 'h-screen overflow-hidden' : ''}`}>
      {currentView === 'home' ? (
        <div className="pb-20 lg:pb-8">
          <Header />
          <DemoBanner weekendOf={demoWeekend} />

          <DayTabs
            selectedDay={selectedDay}
            onDayChange={handleDayChange}
            fridayDate={fridayDate}
            saturdayDate={saturdayDate}
          />

          <div className="max-w-xl lg:max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  onGoingClick={handleGoingClick}
                  onNavigateClick={handleNavigateClick}
                  isAddressVisible={isAddressVisible(party.id)}
                  onViewAddressClick={revealAddress}
                  likePercentage={getLikePercentage(party.id, party.likePercentage)}
                  ratingCount={getRatingCount(party.id, party.ratingCount)}
                  userRating={getUserRating(party.id)}
                  onRateClick={handleStarClick}
                  isRatingActive={isRatingActive(party.doorsOpen, party.date)}
                  isRatingLocked={isRatingLocked(party.date)}
                  isVerified={party.isVerified}
                  posterImage={party.posterImage}
                  onShowToast={showToast}
                />
              ))
            )}
          </div>
        </div>
      ) : currentView === 'map' ? (
        <div className="h-screen lg:h-[calc(100vh-4rem)] flex flex-col">
          <Header title="Party Map" />
          {/* <DemoBanner weekendOf={demoWeekend} /> */}
          <div className="flex-1 pb-16 lg:pb-0">
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
          </div>
        </div>
      ) : (
        <>
          {/* <DemoBanner weekendOf={demoWeekend} /> */}
          <RankingsView weekendOverride={demoWeekend} />
        </>
      )}

      <BottomNav activeView={currentView} onViewChange={handleViewChange} />

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
    </main>
  );
}
