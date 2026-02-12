'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '@/components/Header';
import DayTabs from '@/components/DayTabs';
import PartyCard from '@/components/PartyCard';
import InviteModal from '@/components/InviteModal';
import LoginModal from '@/components/LoginModal';
import ProfileModal from '@/components/ProfileModal';
import AddPartyModal from '@/components/AddPartyModal';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import BottomNav from '@/components/BottomNav';
import MapView from '@/components/MapView';
import { getDefaultDay, getUpcomingDates } from '@/utils/dateHelpers';
import { shareContent } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import useParties from '@/hooks/useParties';
import useToast from '@/hooks/useToast';
import useModalState from '@/hooks/useModalState';
import { useAuth } from '@/contexts/AuthContext';
import { partiesApi } from '@/services/api';

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [currentView, setCurrentView] = useState<'home' | 'map'>('home');
  const [isHydrated, setIsHydrated] = useState(false);

  const { goingParties, isGoing, getCount, toggleGoing } = useGoingStatus();
  const { user, isAuthenticated, needsUsername, logout } = useAuth();
  const { filteredParties, allParties, topPartyId, topPartyIds, isLoadingParties } = useParties(selectedDay, getCount);
  const toast = useToast();
  const modals = useModalState(isAuthenticated, toggleGoing);

  // Get upcoming dates for tabs
  const { friday: fridayDate, saturday: saturdayDate } = useMemo(() => getUpcomingDates(), []);

  // Set default day on mount
  useEffect(() => {
    setSelectedDay(getDefaultDay());
    setIsHydrated(true);
  }, []);

  // Show login modal if user needs to set username
  useEffect(() => {
    if (needsUsername && isHydrated) {
      modals.openLoginForUsername();
    }
  }, [needsUsername, isHydrated, modals.openLoginForUsername]);

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
    const wasGoing = isGoing(partyId);
    await toggleGoing(partyId);

    // Show invite modal when marking as going (not un-going)
    if (!wasGoing) {
      modals.openInviteModal();
    }
  }, [toggleGoing, isGoing, modals.openInviteModal]);

  // Handle share
  const handleShare = useCallback(async () => {
    const result = await shareContent(topGoingParty || undefined);

    if (result.success && result.method === 'clipboard') {
      toast.show('Link copied to clipboard!');
    }
  }, [topGoingParty, toast.show]);

  // Handle day change
  const handleDayChange = useCallback((day: 'friday' | 'saturday') => {
    setSelectedDay(day);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((view: 'home' | 'map') => {
    setCurrentView(view);
  }, []);

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

      toast.show('Party submitted for approval!');
    } catch {
      toast.show('Failed to submit party');
    }
  }, [toast.show]);

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
          <Header
            onAddPartyClick={modals.handleAddPartyClick}
            onAccountClick={modals.handleAccountClick}
            isAuthenticated={isAuthenticated}
            username={user?.username ?? undefined}
          />

          <DayTabs
            selectedDay={selectedDay}
            onDayChange={handleDayChange}
            fridayDate={fridayDate}
            saturdayDate={saturdayDate}
          />

          {/* Party Cards */}
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            {isLoadingParties ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : filteredParties.length === 0 ? (
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
                  onGoingClick={() => handleGoingClick(party.id)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        // Map View (Full Screen)
        <div className="h-screen flex flex-col">
          <Header
            onAddPartyClick={modals.handleAddPartyClick}
            onAccountClick={modals.handleAccountClick}
            isAuthenticated={isAuthenticated}
            username={user?.username ?? undefined}
          />
          <div className="flex-1 pb-16">
            <MapView
              parties={allParties}
              topPartyIds={topPartyIds}
              userGoingParties={goingParties}
              onGoingClick={handleGoingClick}
              fridayDate={fridayDate}
              saturdayDate={saturdayDate}
            />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav activeView={currentView} onViewChange={handleViewChange} />

      {/* Invite Modal */}
      <InviteModal
        isOpen={modals.showInviteModal}
        onClose={modals.closeInviteModal}
        onShare={handleShare}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={modals.showLoginModal}
        onClose={modals.closeLoginModal}
        onSuccess={modals.handleLoginSuccess}
        onShowToast={toast.show}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={modals.showProfileModal}
        onClose={modals.closeProfileModal}
        username={user?.username || ''}
        partyCount={0}
        onLogout={logout}
      />

      {/* Add Party Modal */}
      <AddPartyModal
        isOpen={modals.showAddPartyModal}
        onClose={modals.closeAddPartyModal}
        onSubmit={handlePartySubmit}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={toast.hide}
      />
    </main>
  );
}
