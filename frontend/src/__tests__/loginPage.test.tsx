/**
 * TUP-18: login CTA stays "Temple Email" and unlocks if the student
 * comes back from TU Portal (pageshow / Back).
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';

const signInWithMicrosoft = jest.fn().mockResolvedValue({ success: true });

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    signInWithMicrosoft,
  }),
}));

jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));

describe('Login page CTA (TUP-18)', () => {
  it('always says Temple Email and re-enables after pageshow', async () => {
    render(<LoginPage />);

    const button = await screen.findByRole('button', { name: 'Temple Email' });
    expect(screen.queryByText(/Microsoft/i)).toBeNull();
    expect(screen.queryByText(/Redirecting/i)).toBeNull();

    fireEvent.click(button);

    await waitFor(() => {
      expect((screen.getByRole('button', { name: 'Temple Email' }) as HTMLButtonElement).disabled).toBe(
        true
      );
    });
    expect(screen.queryByText(/Redirecting/i)).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('pageshow'));
    });

    expect((screen.getByRole('button', { name: 'Temple Email' }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });
});
