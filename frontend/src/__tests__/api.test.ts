/**
 * Test cases for API service functions.
 * Tests API calls, error handling, and edge cases.
 * Includes tests for malicious inputs and security concerns.
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      }),
    },
  },
}));

import { authApi, partiesApi, adminApi } from '../services/api';

describe('API Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('authApi', () => {
    describe('signup', () => {
      it('should send signup request with email', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Magic link sent to your email' }),
        });

        const result = await authApi.signup('user@temple.edu');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/signup'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ email: 'user@temple.edu' }),
          })
        );
        expect(result.message).toBe('Magic link sent to your email');
      });

      it('should throw error for non-temple email', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Only @temple.edu email addresses are allowed' }),
        });

        await expect(authApi.signup('user@gmail.com')).rejects.toThrow('temple.edu');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(authApi.signup('user@temple.edu')).rejects.toThrow();
      });

      it('should handle server errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Internal server error' }),
        });

        await expect(authApi.signup('user@temple.edu')).rejects.toThrow();
      });

      it('should sanitize email with special characters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Invalid email' }),
        });

        // XSS attempt in email
        await expect(
          authApi.signup('<script>alert(1)</script>@temple.edu')
        ).rejects.toThrow();
      });
    });

    describe('setUsername', () => {
      it('should send username set request', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Username set successfully', username: 'testuser' }),
        });

        const result = await authApi.setUsername('testuser');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/auth/set-username'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ username: 'testuser' }),
          })
        );
        expect(result.username).toBe('testuser');
      });

      it('should handle empty username', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Username must be at least 2 characters' }),
        });

        await expect(authApi.setUsername('')).rejects.toThrow();
      });

      it('should handle XSS in username', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Username set successfully', username: '<script>' }),
        });

        // Should not throw - server should sanitize/store safely
        const result = await authApi.setUsername('<script>alert(1)</script>');
        expect(result).toBeDefined();
      });
    });

    describe('getMe', () => {
      it('should return user profile', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: '123',
            email: 'user@temple.edu',
            username: 'testuser',
            is_admin: false,
          }),
        });

        const result = await authApi.getMe();

        expect(result?.username).toBe('testuser');
      });

      it('should return null for unauthenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Not authenticated' }),
        });

        const result = await authApi.getMe();
        expect(result).toBeNull();
      });
    });
  });

  describe('partiesApi', () => {
    describe('getParties', () => {
      it('should fetch all parties', async () => {
        const mockParties = [
          { id: '1', title: 'Party 1', goingCount: 10 },
          { id: '2', title: 'Party 2', goingCount: 5 },
        ];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockParties),
        });

        const result = await partiesApi.getParties();

        expect(result).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/parties'),
          expect.any(Object)
        );
      });

      it('should filter by day', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

        await partiesApi.getParties('friday');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('day=friday'),
          expect.any(Object)
        );
      });

      it('should handle invalid day parameter gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

        // Even with invalid day, should not crash
        await partiesApi.getParties('invalid_day');
        expect(mockFetch).toHaveBeenCalled();
      });

      it('should handle SQL injection in day parameter', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

        // SQL injection attempt
        await partiesApi.getParties("'; DROP TABLE parties;--");
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('getParty', () => {
      it('should fetch single party by id', async () => {
        const mockParty = { id: '123', title: 'Test Party' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockParty),
        });

        const result = await partiesApi.getParty('123');

        expect(result.id).toBe('123');
      });

      it('should throw for non-existent party', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Party not found' }),
        });

        await expect(partiesApi.getParty('nonexistent')).rejects.toThrow('not found');
      });

      it('should handle path traversal attempt in id', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Party not found' }),
        });

        // Path traversal attempt
        await expect(partiesApi.getParty('../../../etc/passwd')).rejects.toThrow();
      });
    });

    describe('createParty', () => {
      const validPartyData = {
        title: 'Test Party',
        host: 'Test Host',
        category: 'House Party',
        day: 'friday' as const,
        doors_open: '10 PM',
        address: '123 Test St',
      };

      it('should create party with valid data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...validPartyData, id: '123', goingCount: 0, status: 'pending' }),
        });

        const result = await partiesApi.createParty(validPartyData);

        expect(result.status).toBe('pending');
        expect(result.goingCount).toBe(0);
      });

      it('should reject title over 50 characters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Title must be 50 characters or less' }),
        });

        await expect(
          partiesApi.createParty({ ...validPartyData, title: 'a'.repeat(51) })
        ).rejects.toThrow('50 characters');
      });

      it('should reject host over 30 characters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Host must be 30 characters or less' }),
        });

        await expect(
          partiesApi.createParty({ ...validPartyData, host: 'a'.repeat(31) })
        ).rejects.toThrow('30 characters');
      });

      it('should handle XSS in party fields', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            ...validPartyData,
            title: '<script>alert(1)</script>',
            id: '123',
            goingCount: 0,
            status: 'pending'
          }),
        });

        // Should not throw - server should sanitize
        const result = await partiesApi.createParty({
          ...validPartyData,
          title: '<script>alert(1)</script>',
        });
        expect(result).toBeDefined();
      });

      it('should include coordinates when provided', async () => {
        const dataWithCoords = { ...validPartyData, latitude: 39.981, longitude: -75.155 };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...dataWithCoords, id: '123', goingCount: 0, status: 'pending' }),
        });

        await partiesApi.createParty(dataWithCoords);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('"latitude":39.981'),
          })
        );
      });
    });

    describe('deleteParty', () => {
      it('should delete party', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Party deleted' }),
        });

        await expect(partiesApi.deleteParty('123')).resolves.toBeUndefined();
      });

      it('should throw for unauthorized deletion', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'You can only delete your own parties' }),
        });

        await expect(partiesApi.deleteParty('123')).rejects.toThrow('own');
      });
    });

    describe('toggleGoing', () => {
      it('should toggle going status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ going: true, goingCount: 11 }),
        });

        const result = await partiesApi.toggleGoing('123');

        expect(result.going).toBe(true);
        expect(result.goingCount).toBe(11);
      });

      it('should handle rapid toggles', async () => {
        // Multiple rapid calls should all succeed
        for (let i = 0; i < 5; i++) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ going: i % 2 === 0, goingCount: 10 + (i % 2) }),
          });
        }

        const promises = Array(5).fill(null).map(() => partiesApi.toggleGoing('123'));
        const results = await Promise.all(promises);

        expect(results).toHaveLength(5);
      });
    });

    describe('getUserGoingParties', () => {
      it('should return list of party ids', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(['party1', 'party2', 'party3']),
        });

        const result = await partiesApi.getUserGoingParties();

        expect(result).toHaveLength(3);
        expect(result).toContain('party1');
      });

      it('should return empty array for unauthenticated', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: 'Not authenticated' }),
        });

        const result = await partiesApi.getUserGoingParties();
        expect(result).toEqual([]);
      });
    });
  });

  describe('adminApi', () => {
    describe('getPendingParties', () => {
      it('should fetch pending parties', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: '1', status: 'pending' }]),
        });

        const result = await adminApi.getPendingParties();

        expect(result[0].status).toBe('pending');
      });

      it('should throw for non-admin user', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Admin access required' }),
        });

        await expect(adminApi.getPendingParties()).rejects.toThrow('Admin');
      });
    });

    describe('approveParty', () => {
      it('should approve party', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Party approved', party_id: '123' }),
        });

        const result = await adminApi.approveParty('123');

        expect(result.message).toContain('approved');
      });

      it('should handle already approved party', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Party is not pending' }),
        });

        await expect(adminApi.approveParty('123')).rejects.toThrow('pending');
      });
    });

    describe('rejectParty', () => {
      it('should reject party', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Party rejected', party_id: '123' }),
        });

        const result = await adminApi.rejectParty('123');

        expect(result.message).toContain('rejected');
      });
    });
  });
});
