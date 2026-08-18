export interface Party {
  id: string;
  title: string;
  host: string;
  pinLabel: string;
  category: string;
  day: 'friday' | 'saturday';
  date: string;
  doorsOpen: string;
  doorsClose?: string | null;
  /** Soft-gate: null for anonymous callers */
  address: string | null;
  latitude: number;
  longitude: number;
  /** Soft-gate: null for anonymous callers */
  goingCount: number | null;
  status?: string;
  likePercentage: number | null;
  ratingCount: number | null;
  /** Soft-gate: null for anonymous callers */
  likeCount?: number | null;
  dislikeCount?: number | null;
  isVerified: boolean;
  posterImage?: string;
  description?: string | null;
  ticketPrice?: string | null;
  /** HTTPS ticket link with ref=tuparty. Presence means ticketed (WF-D2). */
  ticketUrl?: string | null;
  promoCode?: string | null;
  promoLabel?: string | null;
  promoHint?: string | null;
  ratingOpen?: boolean;
  ratingLocked?: boolean;
  /** Detail endpoint only: is this the top party (by going count) of its night? */
  isHeadliner?: boolean;
  /**
   * Host credibility for the party-page host row (detail endpoint only).
   * Same numbers as the public leaderboard; null/absent for self-serve
   * hosts that were never linked via host_codes.
   */
  hostStats?: {
    displayName: string;
    partiesHosted: number;
    avgLikePercentage: number;
    logoUrl: string | null;
  } | null;
}

/** GET /parties envelope — weekend dates are authoritative (US/Eastern). */
export interface PartiesListResponse {
  weekendOf: string;
  fridayDate: string;
  saturdayDate: string;
  parties: Party[];
}

export interface AdminParty extends Party {
  createdByUsername: string | null;
  createdByEmail: string | null;
  createdAt: string | null;
}

export interface AdminPartiesListResponse {
  parties: AdminParty[];
  total: number;
  limit: number;
  offset: number;
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
  school_year?: string | null;
  greek_life?: string | null;
  instagram?: string | null;
  avatar_url?: string | null;
  is_host?: boolean;
}

export interface HostApplication {
  id: string;
  userId: string;
  orgType: 'frat' | 'house' | 'other' | string;
  orgName: string;
  instagram: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  createdAt: string | null;
  reviewedAt?: string | null;
  applicantUsername?: string | null;
  applicantEmail?: string | null;
}

export interface HostMeResponse {
  isHost: boolean;
  application: HostApplication | null;
}

export interface AdminHostApplicationsListResponse {
  applications: HostApplication[];
  total: number;
  limit: number;
  offset: number;
}
