export interface Party {
  id: string;
  title: string;
  host: string;
  pinLabel: string;
  category: string;
  day: 'friday' | 'saturday';
  date: string;
  doorsOpen: string;
  address: string;
  latitude: number;
  longitude: number;
  goingCount: number;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface GoingStatuses {
  [partyId: string]: boolean;
}

export interface PartyContextValue {
  parties: Party[];
  goingStatuses: GoingStatuses;
  toggleGoing: (partyId: string) => void;
  selectedPartyId: string | null;
  setSelectedPartyId: (id: string | null) => void;
  getPartyById: (id: string) => Party | undefined;
}
