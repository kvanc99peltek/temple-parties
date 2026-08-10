import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

import { Party, AdminParty, User, PartyRanking, HostRanking, RatingResponse, PartiesListResponse } from '@/lib/types';

type ApiError = Error & { status?: number };

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  return {
    'Content-Type': 'application/json',
  };
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

async function buildApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  let message = fallbackMessage;
  try {
    const error = await response.json();
    if (error?.detail) {
      message = error.detail;
    }
  } catch {
    // Keep fallback message when error response is not JSON.
  }

  const apiError: ApiError = new Error(message);
  apiError.status = response.status;
  return apiError;
}

export type ProfileUpdate = {
  username?: string;
  school_year?: string;
  greek_life?: string;
  instagram?: string;
  avatar_url?: string;
};

export type OtpSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number | null;
  token_type: string;
  user: { id: string | null; email: string };
};

// Auth / profile API (Epic 3 — OTP + /profiles/me)
export const authApi = {
  /** @deprecated Prefer requestOtp — kept as alias for older callers/tests. */
  async signup(email: string): Promise<{ message: string }> {
    return this.requestOtp(email);
  },

  async requestOtp(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send verification code');
    }

    return response.json();
  },

  async verifyOtp(email: string, code: string): Promise<OtpSession> {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid or expired code');
    }

    return response.json();
  },

  async setUsername(username: string): Promise<User> {
    return this.updateProfile({ username });
  },

  async updateProfile(fields: ProfileUpdate): Promise<User> {
    const response = await fetchWithAuth(`${API_URL}/profiles/me`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to update profile');
    }

    return response.json();
  },

  async getMe(): Promise<User> {
    const response = await fetchWithAuth(`${API_URL}/profiles/me`);

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to get user');
    }

    return response.json();
  },
};

// Parties API
export const partiesApi = {
  async getParties(day?: string, weekendOf?: string): Promise<PartiesListResponse> {
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    if (weekendOf) params.set('weekend_of', weekendOf);
    const qs = params.toString();
    const url = qs ? `${API_URL}/parties?${qs}` : `${API_URL}/parties`;
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch parties');
    }

    const payload = await response.json();
    // Back-compat: older payloads were a bare Party[] (pre–Epic 2 envelope).
    if (Array.isArray(payload)) {
      return {
        weekendOf: weekendOf ?? '',
        fridayDate: '',
        saturdayDate: '',
        parties: payload,
      };
    }
    return {
      weekendOf: payload.weekendOf ?? '',
      fridayDate: payload.fridayDate ?? '',
      saturdayDate: payload.saturdayDate ?? '',
      parties: payload.parties ?? [],
    };
  },

  async getParty(partyId: string): Promise<Party> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch party');
    }

    return response.json();
  },

  async createParty(data: {
    title: string;
    host: string;
    pin_label: string;
    category: string;
    date: string;
    doors_open: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }): Promise<Party> {
    const response = await fetchWithAuth(`${API_URL}/parties`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create party');
    }

    return response.json();
  },

  async deleteParty(partyId: string): Promise<void> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete party');
    }
  },

  async toggleGoing(partyId: string): Promise<{ going: boolean; goingCount: number }> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}/going`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to toggle going status');
    }

    return response.json();
  },

  async getUserGoingParties(): Promise<string[]> {
    const response = await fetchWithAuth(`${API_URL}/parties/user/going`);

    if (!response.ok) {
      if (response.status === 401) return [];
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch going parties');
    }

    return response.json();
  },

  async incrementGoingAnonymous(partyId: string): Promise<{ going: boolean; goingCount: number }> {
    const response = await fetch(`${API_URL}/parties/${partyId}/going/anonymous`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to increment going count');
    }

    return response.json();
  },

  async decrementGoingAnonymous(partyId: string): Promise<{ going: boolean; goingCount: number }> {
    const response = await fetch(`${API_URL}/parties/${partyId}/going/anonymous/decrement`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to decrement going count');
    }

    return response.json();
  },

  async getDemoWeekend(): Promise<{ weekendOf: string }> {
    const response = await fetch(`${API_URL}/parties/demo-weekend`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch demo weekend');
    }

    return response.json();
  },
};

// Ratings API
export const ratingsApi = {
  async submitRating(partyId: string, rating: number): Promise<RatingResponse> {
    const response = await fetch(`${API_URL}/ratings/${partyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit rating');
    }

    return response.json();
  },

  async getPartyRating(partyId: string): Promise<{
    partyId: string;
    likePercentage: number;
    ratingCount: number;
    userRating: number | null;
  }> {
    const response = await fetch(`${API_URL}/ratings/${partyId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get rating');
    }

    return response.json();
  },

  async getRankings(params?: {
    weekendOf?: string;
    weekendFrom?: string;
    weekendTo?: string;
  }): Promise<PartyRanking[]> {
    const searchParams = new URLSearchParams();
    if (params?.weekendOf) searchParams.set('weekend_of', params.weekendOf);
    if (params?.weekendFrom) searchParams.set('weekend_from', params.weekendFrom);
    if (params?.weekendTo) searchParams.set('weekend_to', params.weekendTo);
    const qs = searchParams.toString();
    const url = qs ? `${API_URL}/ratings?${qs}` : `${API_URL}/ratings`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch rankings');
    }

    return response.json();
  },

  async getHostRankings(): Promise<HostRanking[]> {
    const response = await fetch(`${API_URL}/ratings/hosts`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch host rankings');
    }

    return response.json();
  },
};

// Admin API
export const adminApi = {
  async getParties(status?: string): Promise<AdminParty[]> {
    const url = status
      ? `${API_URL}/admin/parties?status=${status}`
      : `${API_URL}/admin/parties`;
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch parties');
    }

    return response.json();
  },

  async approveParty(partyId: string): Promise<{ message: string; party_id: string }> {
    const response = await fetchWithAuth(`${API_URL}/admin/parties/${partyId}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to approve party');
    }

    return response.json();
  },

  async rejectParty(partyId: string): Promise<{ message: string; party_id: string }> {
    const response = await fetchWithAuth(`${API_URL}/admin/parties/${partyId}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reject party');
    }

    return response.json();
  },
};
