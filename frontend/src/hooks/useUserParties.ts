'use client';

import { useState, useEffect, useCallback } from 'react';

interface Party {
  id: string;
  title: string;
  host: string;
  category: string;
  day: 'friday' | 'saturday';
  doorsOpen: string;
  address: string;
  latitude: number;
  longitude: number;
  goingCount: number;
  createdBy?: string;
  createdAt?: string;
}

interface NewPartyInput {
  title: string;
  host: string;
  address: string;
  doorsOpen: string;
  category: string;
  day: 'friday' | 'saturday';
}

const STORAGE_KEY = 'temple_parties_user_parties';

// Temple University campus area bounds for random coordinates
const TEMPLE_BOUNDS = {
  minLat: 39.978,
  maxLat: 39.985,
  minLng: -75.162,
  maxLng: -75.148,
};

function getRandomCoordinate(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function useUserParties(userEmail?: string) {
  const [userParties, setUserParties] = useState<Party[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUserParties(JSON.parse(stored));
      }
    } catch {
      // Invalid stored data
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when parties change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userParties));
    }
  }, [userParties, isHydrated]);

  const addParty = useCallback((input: NewPartyInput): Party => {
    const newParty: Party = {
      id: `user-party-${Date.now()}`,
      title: input.title,
      host: input.host,
      category: input.category,
      day: input.day,
      doorsOpen: input.doorsOpen,
      address: input.address,
      latitude: getRandomCoordinate(TEMPLE_BOUNDS.minLat, TEMPLE_BOUNDS.maxLat),
      longitude: getRandomCoordinate(TEMPLE_BOUNDS.minLng, TEMPLE_BOUNDS.maxLng),
      goingCount: 0,
      createdBy: userEmail,
      createdAt: new Date().toISOString(),
    };

    setUserParties(prev => [...prev, newParty]);
    return newParty;
  }, [userEmail]);

  const getUserPartyCount = useCallback((email?: string): number => {
    if (!email) return 0;
    return userParties.filter(p => p.createdBy === email).length;
  }, [userParties]);

  return {
    userParties,
    addParty,
    getUserPartyCount,
    isHydrated,
  };
}
