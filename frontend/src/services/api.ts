import { supabase } from '@/lib/supabase';

const API_URL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    : '/backend';

import { Party, AdminPartiesListResponse, User, PartyRanking, HostRanking, RatingResponse, PartiesListResponse, HostMeResponse, HostApplication, AdminHostApplicationsListResponse } from '@/lib/types';

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

// Auth / profile API (Epic 3 — OTP + /profiles/me; Epic 6 — username check + avatar)
export const authApi = {
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

  async checkUsernameAvailable(
    username: string
  ): Promise<{ username: string; available: boolean; reason: string | null }> {
    const params = new URLSearchParams({ username });
    const response = await fetchWithAuth(
      `${API_URL}/profiles/username-available?${params.toString()}`
    );

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to check username');
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

  async uploadAvatar(blob: Blob, filename = 'avatar.jpg'): Promise<User> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not signed in');
    }

    const form = new FormData();
    form.append('file', blob, filename);

    const response = await fetch(`${API_URL}/profiles/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to upload avatar');
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

export const hostsApi = {
  async getMe(): Promise<HostMeResponse> {
    const response = await fetchWithAuth(`${API_URL}/hosts/me`);
    if (!response.ok) {
      throw await buildApiError(response, 'Failed to load host status');
    }
    return response.json();
  },

  async apply(data: {
    org_type: 'frat' | 'house' | 'other';
    org_name: string;
    instagram: string;
    address: string;
  }): Promise<HostApplication> {
    const response = await fetchWithAuth(`${API_URL}/hosts/applications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw await buildApiError(response, 'Failed to submit host application');
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
    description?: string;
    ticket_price?: string;
    doors_close?: string;
    external_ticket_url?: string;
    promo_code?: string;
    promo_label?: string;
    promo_hint?: string;
    /** Storage path from uploadPoster — not an arbitrary URL. */
    poster_image?: string;
  }): Promise<Party> {
    const response = await fetchWithAuth(`${API_URL}/parties`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to create party');
    }

    return response.json();
  },

  async updateParty(
    partyId: string,
    data: {
      title?: string;
      host?: string;
      pin_label?: string;
      category?: string;
      date?: string;
      doors_open?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      description?: string | null;
      ticket_price?: string | null;
      doors_close?: string | null;
      external_ticket_url?: string | null;
      promo_code?: string | null;
      promo_label?: string | null;
      promo_hint?: string | null;
      poster_image?: string | null;
    }
  ): Promise<Party> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to update party');
    }

    return response.json();
  },

  /** Mediated poster upload — returns storage path only (Epic 8.1). */
  async uploadPoster(blob: Blob, filename = 'poster.jpg'): Promise<{ path: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not signed in');
    }

    const form = new FormData();
    form.append('file', blob, filename);

    const response = await fetch(`${API_URL}/parties/poster`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: form,
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to upload poster');
    }

    return response.json();
  },

  async getMyParties(): Promise<Party[]> {
    const response = await fetchWithAuth(`${API_URL}/parties/mine`);

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to fetch your parties');
    }

    return response.json();
  },

  /** Future weekends for create-party (never the past browse weekend). */
  async getCreateOptions(): Promise<{
    today: string;
    weekends: Array<{ weekendOf: string; fridayDate: string; saturdayDate: string }>;
  }> {
    const response = await fetchWithAuth(`${API_URL}/parties/create-options`);

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to load weekend options');
    }

    return response.json();
  },

  /** Server-proxied Nominatim autocomplete (browser → OSM is 403). */
  async suggestAddresses(
    query: string
  ): Promise<Array<{ display_name: string; lat: number; lon: number }>> {
    const params = new URLSearchParams({ q: query });
    const response = await fetchWithAuth(
      `${API_URL}/parties/address-suggest?${params.toString()}`
    );

    if (!response.ok) {
      throw await buildApiError(response, 'Failed to look up address');
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

  async markGoing(partyId: string): Promise<{ going: boolean; goingCount: number }> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}/going`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to mark going');
    }

    return response.json();
  },

  async unmarkGoing(partyId: string): Promise<{ going: boolean; goingCount: number }> {
    const response = await fetchWithAuth(`${API_URL}/parties/${partyId}/going`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to unmark going');
    }

    return response.json();
  },

  /** Client-side toggle: POST to mark, DELETE to unmark. */
  async toggleGoing(
    partyId: string,
    currentlyGoing: boolean
  ): Promise<{ going: boolean; goingCount: number }> {
    return currentlyGoing
      ? this.unmarkGoing(partyId)
      : this.markGoing(partyId);
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
    const response = await fetchWithAuth(`${API_URL}/ratings/${partyId}`, {
      method: 'POST',
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
    const response = await fetchWithAuth(`${API_URL}/ratings/${partyId}`);

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
    const response = await fetchWithAuth(url);

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
  async getParties(
    status?: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<AdminPartiesListResponse> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('limit', String(opts?.limit ?? 20));
    params.set('offset', String(opts?.offset ?? 0));
    const response = await fetchWithAuth(`${API_URL}/admin/parties?${params.toString()}`);

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

  async getHostApplications(
    status?: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<AdminHostApplicationsListResponse> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('limit', String(opts?.limit ?? 20));
    params.set('offset', String(opts?.offset ?? 0));
    const response = await fetchWithAuth(
      `${API_URL}/admin/host-applications?${params.toString()}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch host applications');
    }
    return response.json();
  },

  async approveHostApplication(
    applicationId: string
  ): Promise<{ message: string; application_id: string }> {
    const response = await fetchWithAuth(
      `${API_URL}/admin/host-applications/${applicationId}/approve`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to approve host');
    }
    return response.json();
  },

  async rejectHostApplication(
    applicationId: string
  ): Promise<{ message: string; application_id: string }> {
    const response = await fetchWithAuth(
      `${API_URL}/admin/host-applications/${applicationId}/reject`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to reject host');
    }
    return response.json();
  },
};
