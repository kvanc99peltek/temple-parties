'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'temple_parties_address_visible_v1';

function loadVisibleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function persistVisibleIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function useAddressVisibility() {
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  useEffect(() => {
    setVisibleIds(loadVisibleIds());
  }, []);

  const isAddressVisible = useCallback(
    (partyId: string) => visibleIds.includes(partyId),
    [visibleIds]
  );

  const revealAddress = useCallback((partyId: string) => {
    setVisibleIds((prev) => {
      if (prev.includes(partyId)) return prev;
      const next = [...prev, partyId];
      persistVisibleIds(next);
      return next;
    });
  }, []);

  return { isAddressVisible, revealAddress };
}

