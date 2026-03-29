'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SPONSOR_REMINDER_STORAGE_KEY } from '@/lib/constants';

interface UseSponsorReminderReturn {
  showSponsorReminder: boolean;
  dismissSponsorReminder: () => void;
}

function getDismissals(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(SPONSOR_REMINDER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markDismissed(nightKey: string): void {
  if (typeof window === 'undefined') return;
  const current = getDismissals();
  current[nightKey] = true;
  localStorage.setItem(SPONSOR_REMINDER_STORAGE_KEY, JSON.stringify(current));
}

/**
 * Get a key identifying the current party night, or null if not in a party night window.
 * Saturday 00:30–05:59 → "YYYY-MM-DD_sat" (Friday night parties)
 * Sunday 00:30–05:59 → "YYYY-MM-DD_sun" (Saturday night parties)
 */
function getPartyNightKey(): string | null {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Saturday or Sunday, between 00:30 and 05:59
  if ((day === 6 || day === 0) && timeInMinutes >= 30 && hour < 6) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const nightLabel = day === 6 ? 'sat' : 'sun';
    return `${y}-${m}-${d}_${nightLabel}`;
  }

  return null;
}

export default function useSponsorReminder(isHydrated: boolean): UseSponsorReminderReturn {
  const [show, setShow] = useState(false);
  const hasComputed = useRef(false);
  const nightKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || hasComputed.current) return;
    hasComputed.current = true;

    const nightKey = getPartyNightKey();
    if (!nightKey) return;

    nightKeyRef.current = nightKey;
    const dismissed = !!getDismissals()[nightKey];
    if (!dismissed) {
      setShow(true);
    }
  }, [isHydrated]);

  const dismissSponsorReminder = useCallback(() => {
    if (nightKeyRef.current) {
      markDismissed(nightKeyRef.current);
    }
    setShow(false);
  }, []);

  return { showSponsorReminder: show, dismissSponsorReminder };
}
