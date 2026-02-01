"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { Party, GoingStatuses, PartyContextValue } from "@/lib/types";
import { mockParties } from "@/data/mockParties";
import { useDebounce } from "@/hooks/useDebounce";

const STORAGE_KEY = "temple-parties-going";

const PartyContext = createContext<PartyContextValue | undefined>(undefined);

export function PartyProvider({ children }: { children: ReactNode }) {
  const [baseParties] = useState<Party[]>(mockParties);
  const [goingStatuses, setGoingStatuses] = useState<GoingStatuses>({});
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load goingStatuses from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GoingStatuses;
        setGoingStatuses(parsed);
      } catch {
        // Invalid JSON, ignore
      }
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage (debounced)
  const persistToStorage = useCallback((statuses: GoingStatuses) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  }, []);

  const debouncedPersist = useDebounce(persistToStorage, 300);

  // Calculate parties with adjusted goingCount based on user's going status
  const parties = useMemo(() => {
    if (!isHydrated) {
      // Before hydration, return parties sorted by original goingCount
      return [...baseParties].sort((a, b) => b.goingCount - a.goingCount);
    }

    // Adjust goingCount based on user's going status
    const adjustedParties = baseParties.map((party) => {
      const userIsGoing = goingStatuses[party.id] || false;
      return {
        ...party,
        goingCount: party.goingCount + (userIsGoing ? 1 : 0),
      };
    });

    // Sort by goingCount descending
    return adjustedParties.sort((a, b) => b.goingCount - a.goingCount);
  }, [baseParties, goingStatuses, isHydrated]);

  const toggleGoing = useCallback(
    (partyId: string) => {
      setGoingStatuses((prev) => {
        const newStatuses = {
          ...prev,
          [partyId]: !prev[partyId],
        };
        debouncedPersist(newStatuses);
        return newStatuses;
      });
    },
    [debouncedPersist]
  );

  const getPartyById = useCallback(
    (id: string) => {
      return parties.find((p) => p.id === id);
    },
    [parties]
  );

  const value: PartyContextValue = {
    parties,
    goingStatuses,
    toggleGoing,
    selectedPartyId,
    setSelectedPartyId,
    getPartyById,
  };

  return (
    <PartyContext.Provider value={value}>{children}</PartyContext.Provider>
  );
}

export function useParty() {
  const context = useContext(PartyContext);
  if (context === undefined) {
    throw new Error("useParty must be used within a PartyProvider");
  }
  return context;
}
