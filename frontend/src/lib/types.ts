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
  likePercentage: number;
  ratingCount: number;
  isVerified: boolean;
  posterImage?: string;
  description?: string | null;
  ticketPrice?: string | null;
  ratingOpen?: boolean;
  ratingLocked?: boolean;
}

export interface AdminParty extends Party {
  createdByUsername: string | null;
  createdByEmail: string | null;
  createdAt: string | null;
}

export interface PartyRanking {
  id: string;
  title: string;
  host: string;
  category: string;
  day: 'friday' | 'saturday';
  date: string;
  doorsOpen: string;
  likePercentage: number;
  ratingCount: number;
  goingCount: number;
  userRating: number | null;
}

export interface HostRanking {
  hostCode: string;
  displayName: string;
  logoUrl: string | null;
  partiesHosted: number;
  totalRatingCount: number;
  totalGoingCount: number;
  avgLikePercentage: number;
  bayesianScore: number;
  finalScore: number;
  isEligible: boolean;
}

export interface RatingResponse {
  partyId: string;
  rating: number;
  likePercentage: number;
  ratingCount: number;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at: string;
}
