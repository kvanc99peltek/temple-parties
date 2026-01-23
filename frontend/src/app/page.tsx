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
import { shareContent, Party } from '@/utils/shareHelpers';
import useGoingStatus from '@/hooks/useGoingStatus';
import { useAuth } from '@/contexts/AuthContext';
import { partiesApi } from '@/services/api';

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>('friday');
  const [currentView, setCurrentView] = useState<'home' | 'map'>('home');
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'addParty' | 'going' | null>(null);
  const [pendingPartyId, setPendingPartyId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(true);

  const { goingParties, isGoing, getCount, toggleGoing } = useGoingStatus();
  const { user, isAuthenticated, needsUsername, logout } = useAuth();

  // Get upcoming dates for tabs
  const { friday: fridayDate, saturday: saturdayDate } = useMemo(() => getUpcomingDates(), []);

  // Fetch parties from API
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const data = await partiesApi.getParties();
        setParties(data);
      } catch (error) {
        console.error('Failed to fetch parties:', error);
      } finally {
        setIsLoadingParties(false);
      }
    };

    fetchParties();
  }, []);

  // Set default day on mount
  useEffect(() => {
    setSelectedDay(getDefaultDay());
    setIsHydrated(true);
  }, []);

  // Show login modal if user needs to set username
  useEffect(() => {
    if (needsUsername && isHydrated) {
      setShowLoginModal(true);
    }
  }, [needsUsername, isHydrated]);

  // Filter and sort parties for selected day
  const filteredParties = useMemo(() => {
    return parties
      .filter(party => party.day === selectedDay)
      .map(party => ({
        ...party,
        goingCount: getCount(party.id, party.goingCount)
      }))
      .sort((a, b) => b.goingCount - a.goingCount);
  }, [selectedDay, getCount, parties]);

  // Get ALL parties for map view (both days)
  const allParties = useMemo(() => {
    return parties.map(party => ({
      ...party,
      goingCount: getCount(party.id, party.goingCount)
    }));
  }, [getCount, parties]);

  // Get the top party ID for HYPED badge (per day)
  const topPartyId = filteredParties.length > 0 ? filteredParties[0].id : null;

  // Get top party IDs for each day (for map view)
  const topPartyIds = useMemo(() => {
    const fridayParties = allParties.filter(p => p.day === 'friday').sort((a, b) => b.goingCount - a.goingCount);
    const saturdayParties = allParties.filter(p => p.day === 'saturday').sort((a, b) => b.goingCount - a.goingCount);
    return {
      friday: fridayParties.length > 0 ? fridayParties[0].id : null,
      saturday: saturdayParties.length > 0 ? saturdayParties[0].id : null,
    };
  }, [allParties]);

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
      setShowModal(true);
    }
  }, [toggleGoing, isGoing]);

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

  // Handle view change
  const handleViewChange = useCallback((view: 'home' | 'map') => {
    setCurrentView(view);
  }, []);

  // Handle Add Party button click
  const handleAddPartyClick = useCallback(() => {
    if (!isAuthenticated) {
      setPendingAction('addParty');
      setShowLoginModal(true);
    } else {
      setShowAddPartyModal(true);
    }
  }, [isAuthenticated]);

  // Handle Account button click
  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      setShowProfileModal(true);
    } else {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  // Handle login success
  const handleLoginSuccess = useCallback(async () => {
    if (pendingAction === 'addParty') {
      setShowAddPartyModal(true);
    } else if (pendingAction === 'going' && pendingPartyId) {
      await toggleGoing(pendingPartyId);
      setShowModal(true);
    }
    setPendingAction(null);
    setPendingPartyId(null);
  }, [pendingAction, pendingPartyId, toggleGoing]);

  // Handle party submission
  const handlePartySubmit = useCallback(async (partyData: { title: string; host: string; address: string; doorsOpen: string; category: string; day: 'friday' | 'saturday' }) => {
    try {
      const newParty = await partiesApi.createParty({
        title: partyData.title,
        host: partyData.host,
        address: partyData.address,
        doors_open: partyData.doorsOpen,
        category: partyData.category,
        day: partyData.day,
      });

      // Party is pending, so don't add to list yet
      setToastMessage('Party submitted for approval!');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to submit party');
      setShowToast(true);
    }
  }, []);

  // Handle showing toast (for login modal)
  const handleShowToast = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
  }, []);

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
            onAddPartyClick={handleAddPartyClick}
            onAccountClick={handleAccountClick}
            isAuthenticated={isAuthenticated}
            username={user?.username}
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
            onAddPartyClick={handleAddPartyClick}
            onAccountClick={handleAccountClick}
            isAuthenticated={isAuthenticated}
            username={user?.username}
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
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onShare={handleShare}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingAction(null);
          setPendingPartyId(null);
        }}
        onSuccess={handleLoginSuccess}
        onShowToast={handleShowToast}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={user?.username || ''}
        partyCount={0}
        onLogout={logout}
      />

      {/* Add Party Modal */}
      <AddPartyModal
        isOpen={showAddPartyModal}
        onClose={() => setShowAddPartyModal(false)}
        onSubmit={handlePartySubmit}
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
