import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  status?: string;
}

interface User {
  id: string;
  email: string;
  username: string | null;
  is_admin: boolean;
  created_at: string;
}

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

// Auth API
export const authApi = {
  async signup(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }

    return response.json();
  },

  async setUsername(username: string): Promise<{ message: string; username: string }> {
    const response = await fetchWithAuth(`${API_URL}/auth/set-username`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to set username');
    }

    return response.json();
  },

  async getMe(): Promise<User | null> {
    const response = await fetchWithAuth(`${API_URL}/auth/me`);

    if (!response.ok) {
      if (response.status === 401) return null;
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get user');
    }

    const data = await response.json();
    // Backend returns null if user exists in auth but not in user_profiles
    return data;
  },
};

// Parties API
export const partiesApi = {
  async getParties(day?: string): Promise<Party[]> {
    const url = day ? `${API_URL}/parties?day=${day}` : `${API_URL}/parties`;
    const response = await fetchWithAuth(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch parties');
    }

    return response.json();
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
    category: string;
    day: 'friday' | 'saturday';
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
};

// Admin API
export const adminApi = {
  async getPendingParties(): Promise<Party[]> {
    const response = await fetchWithAuth(`${API_URL}/admin/parties/pending`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch pending parties');
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
