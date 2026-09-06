import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { partyPath } from '@/lib/authHelpers';
import {
  clearPendingAuthAction,
  saveAuthNextPath,
  savePendingAuthAction,
  takePendingAuthAction,
  type PendingAuthAction,
} from '@/lib/pendingAuthAction';

/** Soft-gate: Going / Navigate / Add Party / Rate require login.
 *  The hard account wall (AuthGate) sits in front of the live app; these
 *  remain as a safety net if an action is reached while logged out. */
export const AUTH_GATE_ENABLED = true;

/**
 * Soft-gate + post-auth action replay (Epic 6.7 / 8.3).
 * Login/profile/create are routes; invite stays a modal.
 */
export default function useModalState(
  isAuthenticated: boolean,
  toggleGoing: (partyId: string) => Promise<void>
) {
  const router = useRouter();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const openInviteModal = useCallback(() => setShowInviteModal(true), []);
  const closeInviteModal = useCallback(() => setShowInviteModal(false), []);

  const openLogin = useCallback(
    (action?: PendingAuthAction, next = '/') => {
      if (action) savePendingAuthAction(action);
      saveAuthNextPath(next);
      const params = new URLSearchParams({ next });
      router.push(`/login?${params.toString()}`);
    },
    [router]
  );

  const handleAddPartyClick = useCallback(() => {
    if (AUTH_GATE_ENABLED && !isAuthenticated) {
      openLogin({ type: 'addParty' }, '/create');
      return;
    }
    router.push('/create');
  }, [isAuthenticated, openLogin, router]);

  const handleAccountClick = useCallback(() => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      openLogin(undefined, '/profile');
    }
  }, [isAuthenticated, openLogin, router]);

  /** Returns true if the caller should abort (redirected to login). */
  const requireAuthForGoing = useCallback(
    (partyId: string, next = partyPath(partyId)): boolean => {
      if (!AUTH_GATE_ENABLED) return false;
      if (isAuthenticated) return false;
      openLogin({ type: 'going', partyId }, next);
      return true;
    },
    [isAuthenticated, openLogin]
  );

  /** Soft-gate for rating entry. */
  const requireAuthForRating = useCallback(
    (next = '/'): boolean => {
      if (!AUTH_GATE_ENABLED) return false;
      if (isAuthenticated) return false;
      openLogin(undefined, next);
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
      router.push('/create');
    }
    return action;
  }, [isAuthenticated, router, toggleGoing]);

  const cancelPendingAuthAction = useCallback(() => {
    clearPendingAuthAction();
  }, []);

  return {
    showInviteModal,
    openInviteModal,
    closeInviteModal,
    openLogin,
    handleAddPartyClick,
    handleAccountClick,
    requireAuthForGoing,
    requireAuthForRating,
    replayPendingAuthAction,
    cancelPendingAuthAction,
  };
}
