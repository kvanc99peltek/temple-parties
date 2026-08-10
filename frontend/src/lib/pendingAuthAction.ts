/**
 * Soft-gate action replay (Epic 6.7).
 * Survives the /login → /onboarding round-trip via sessionStorage.
 */

export type PendingAuthAction =
  | { type: 'going'; partyId: string }
  | { type: 'addParty' };

const KEY = 'temple_pending_auth_action';

export function savePendingAuthAction(action: PendingAuthAction): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(action));
  } catch {
    // private mode / quota — soft-gate replay just won't fire
  }
}

export function peekPendingAuthAction(): PendingAuthAction | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAuthAction;
    if (parsed?.type === 'going' && typeof parsed.partyId === 'string') return parsed;
    if (parsed?.type === 'addParty') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function takePendingAuthAction(): PendingAuthAction | null {
  const action = peekPendingAuthAction();
  clearPendingAuthAction();
  return action;
}

export function clearPendingAuthAction(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
