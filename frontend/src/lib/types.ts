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

export interface AdminParty extends Party {
  createdByUsername: string | null;
  createdByEmail: string | null;
  createdAt: string | null;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at: string;
}

