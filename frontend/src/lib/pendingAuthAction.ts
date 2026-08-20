/**
 * Soft-gate action replay (Epic 6.7).
 * Survives the /login → /onboarding round-trip via sessionStorage.
 */

import { partyPath, sanitizeNextPath } from '@/lib/authHelpers';

export type PendingAuthAction =
  | { type: 'going'; partyId: string }
  | { type: 'addParty' };

const KEY = 'temple_pending_auth_action';
const NEXT_KEY = 'temple_auth_next';

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

/** Persist the post-login destination in case OAuth strips `?next=` off the callback URL. */
export function saveAuthNextPath(path: string): void {
  try {
    sessionStorage.setItem(NEXT_KEY, sanitizeNextPath(path));
  } catch {
    // private mode / quota
  }
}

export function peekAuthNextPath(): string {
  try {
    return sanitizeNextPath(sessionStorage.getItem(NEXT_KEY));
  } catch {
    return '/';
  }
}

export function takeAuthNextPath(): string {
  const next = peekAuthNextPath();
  clearAuthNextPath();
  return next;
}

export function clearAuthNextPath(): void {
  try {
    sessionStorage.removeItem(NEXT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Prefer `?next=` on the callback URL, then sessionStorage, then the pending
 * GOING/create action. Always a sanitized in-app path.
 */
export function resolvePostAuthPath(urlNext: string | null | undefined): string {
  const fromUrl = sanitizeNextPath(urlNext);
  if (fromUrl !== '/') {
    return fromUrl;
  }
  const stored = peekAuthNextPath();
  if (stored !== '/') return stored;
  const pending = peekPendingAuthAction();
  if (pending?.type === 'going') return partyPath(pending.partyId);
  if (pending?.type === 'addParty') return '/create';
  return '/';
}
