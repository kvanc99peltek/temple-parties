import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearPendingAuthAction,
  savePendingAuthAction,
  takePendingAuthAction,
  type PendingAuthAction,
} from '@/lib/pendingAuthAction';

/**
 * TEMP — flip to `true` once Supabase free-tier email quota resets and OTP can be tested.
 * When false: Going / Navigate / Add Party work without login (launch-mode soft-gate off).
 */
export const AUTH_GATE_ENABLED = false;

/**
 * Soft-gate + post-auth action replay (Epic 6.7).
 * Login/profile are routes; invite + add-party stay modals until Epic 8.
 */
export default function useModalState(
  isAuthenticated: boolean,
  toggleGoing: (partyId: string) => Promise<void>
) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);

  const openInviteModal = useCallback(() => setShowInviteModal(true), []);
  const closeInviteModal = useCallback(() => setShowInviteModal(false), []);
  const closeAddPartyModal = useCallback(() => setShowAddPartyModal(false), []);

  const openLogin = useCallback(
    (action?: PendingAuthAction, next = '/') => {
      if (action) savePendingAuthAction(action);
      const params = new URLSearchParams({ next });
      router.push(`/login?${params.toString()}`);
    },
    [router]
  );

  const handleAddPartyClick = useCallback(() => {
    // TEMP: AUTH_GATE_ENABLED — restore login requirement for add-party
    if (AUTH_GATE_ENABLED && !isAuthenticated) {
      openLogin({ type: 'addParty' });
      return;
    }
    setShowAddPartyModal(true);
  }, [isAuthenticated, openLogin]);

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      openLogin(undefined, '/profile');
    }
  }, [isAuthenticated, openLogin, router]);

  /** Returns true if the caller should abort (redirected to login). */
  const requireAuthForGoing = useCallback(
    (partyId: string, next = '/'): boolean => {
      // TEMP: AUTH_GATE_ENABLED — restore RSVP soft-gate
      if (!AUTH_GATE_ENABLED) return false;
      if (isAuthenticated) return false;
      openLogin({ type: 'going', partyId }, next);
      return true;
    },
    [isAuthenticated, openLogin]
  );

  const replayPendingAuthAction = useCallback(async (): Promise<PendingAuthAction | null> => {
    if (!isAuthenticated) return null;
    const action = takePendingAuthAction();
    if (!action) return null;

    if (action.type === 'going') {
      await toggleGoing(action.partyId);
      setShowInviteModal(true);
    } else if (action.type === 'addParty') {
      setShowAddPartyModal(true);
    }
    return action;
  }, [isAuthenticated, toggleGoing]);

  const cancelPendingAuthAction = useCallback(() => {
    clearPendingAuthAction();
  }, []);

  return {
    showInviteModal,
    showAddPartyModal,
    openInviteModal,
    closeInviteModal,
    closeAddPartyModal,
    openLogin,
    handleAddPartyClick,
    handleAccountClick,
    requireAuthForGoing,
    replayPendingAuthAction,
    cancelPendingAuthAction,
  };
}
