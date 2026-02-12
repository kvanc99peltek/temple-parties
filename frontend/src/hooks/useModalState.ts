import { useState, useCallback } from 'react';

export default function useModalState(
  isAuthenticated: boolean,
  toggleGoing: (partyId: string) => Promise<void>
) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'addParty' | 'going' | null>(null);
  const [pendingPartyId, setPendingPartyId] = useState<string | null>(null);

  const openInviteModal = useCallback(() => setShowInviteModal(true), []);
  const closeInviteModal = useCallback(() => setShowInviteModal(false), []);

  const closeLoginModal = useCallback(() => {
    setShowLoginModal(false);
    setPendingAction(null);
    setPendingPartyId(null);
  }, []);

  const closeProfileModal = useCallback(() => setShowProfileModal(false), []);
  const closeAddPartyModal = useCallback(() => setShowAddPartyModal(false), []);

  const handleAddPartyClick = useCallback(() => {
    if (!isAuthenticated) {
      setPendingAction('addParty');
      setShowLoginModal(true);
    } else {
      setShowAddPartyModal(true);
    }
  }, [isAuthenticated]);

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      setShowProfileModal(true);
    } else {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = useCallback(async () => {
    if (pendingAction === 'addParty') {
      setShowAddPartyModal(true);
    } else if (pendingAction === 'going' && pendingPartyId) {
      await toggleGoing(pendingPartyId);
      setShowInviteModal(true);
    }
    setPendingAction(null);
    setPendingPartyId(null);
  }, [pendingAction, pendingPartyId, toggleGoing]);

  const openLoginForUsername = useCallback(() => {
    setShowLoginModal(true);
  }, []);

  return {
    showInviteModal,
    showLoginModal,
    showProfileModal,
    showAddPartyModal,
    openInviteModal,
    closeInviteModal,
    closeLoginModal,
    closeProfileModal,
    closeAddPartyModal,
    handleAddPartyClick,
    handleAccountClick,
    handleLoginSuccess,
    openLoginForUsername,
  };
}
