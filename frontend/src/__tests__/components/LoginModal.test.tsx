/**
 * Test cases for LoginModal component.
 * Tests email validation, magic link flow, username setup, and edge cases.
 *
 * Note: These tests mock the useAuth hook to test component behavior.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the useAuth hook before importing the component
const mockSendMagicLink = jest.fn().mockResolvedValue({ success: true });
const mockSetUsername = jest.fn().mockResolvedValue({ success: true });
const mockLogout = jest.fn();
const mockRefreshUser = jest.fn();

let mockNeedsUsername = false;

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsUsername: mockNeedsUsername,
    sendMagicLink: mockSendMagicLink,
    setUsername: mockSetUsername,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
  }),
}));

import LoginModal from '@/components/LoginModal';

describe('LoginModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnShowToast = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    onShowToast: mockOnShowToast,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSuccess.mockClear();
    mockOnShowToast.mockClear();
    mockSendMagicLink.mockClear();
    mockSetUsername.mockClear();
    mockSendMagicLink.mockResolvedValue({ success: true });
    mockSetUsername.mockResolvedValue({ success: true });
    mockNeedsUsername = false;
  });

  describe('Email Step', () => {
    it('should render email input when opened', () => {
      render(<LoginModal {...defaultProps} />);

      expect(screen.getByText('Log in to Temple Parties')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/temple\.edu/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<LoginModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Log in to Temple Parties')).not.toBeInTheDocument();
    });

    it('should show temple.edu hint in placeholder', () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      expect(emailInput).toHaveAttribute('placeholder', 'yourname@temple.edu');
    });

    it('should disable submit button when email is empty', () => {
      render(<LoginModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when email is entered', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Email Validation', () => {
    it('should call sendMagicLink with entered email', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      expect(mockSendMagicLink).toHaveBeenCalledWith('user@temple.edu');
    });

    it('should show error for failed magic link', async () => {
      mockSendMagicLink.mockResolvedValue({
        success: false,
        error: 'Only @temple.edu email addresses are allowed',
      });

      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@gmail.com');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/temple\.edu/i)).toBeInTheDocument();
      });
    });
  });

  describe('Security - Email Input', () => {
    it('should handle XSS in email field', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      // Use fireEvent.change for special characters that userEvent.type struggles with
      fireEvent.change(emailInput, { target: { value: '<script>alert(1)</script>@temple.edu' } });

      // Submit the form directly
      const form = emailInput.closest('form')!;
      fireEvent.submit(form);

      // Should be passed to backend for validation (async form submission)
      await waitFor(() => {
        expect(mockSendMagicLink).toHaveBeenCalled();
      });
    });

    it('should handle SQL injection in email field', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      // Use fireEvent.change for special characters that userEvent.type struggles with
      fireEvent.change(emailInput, { target: { value: "user'; DROP TABLE users;--@temple.edu" } });

      // Submit the form directly
      const form = emailInput.closest('form')!;
      fireEvent.submit(form);

      // Async form submission
      await waitFor(() => {
        expect(mockSendMagicLink).toHaveBeenCalled();
      });
    });
  });

  describe('Sent Step', () => {
    it('should show sent screen after successful magic link', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    it('should display entered email on sent screen', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'test@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('test@temple.edu')).toBeInTheDocument();
      });
    });

    it('should have back button on sent screen', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/go back/i)).toBeInTheDocument();
      });
    });

    it('should go back to email step when back is clicked', async () => {
      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/go back/i)).toBeInTheDocument();
      });

      const backButton = screen.getByLabelText(/go back/i);
      fireEvent.click(backButton);

      expect(screen.getByPlaceholderText(/temple\.edu/i)).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('should close on escape key', () => {
      render(<LoginModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on close button click', () => {
      render(<LoginModal {...defaultProps} />);

      const closeButton = screen.getByLabelText(/close modal/i);
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during magic link send', async () => {
      mockSendMagicLink.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<LoginModal {...defaultProps} />);

      const emailInput = screen.getByPlaceholderText(/temple\.edu/i);
      await userEvent.type(emailInput, 'user@temple.edu');

      const submitButton = screen.getByRole('button', { name: /send magic link/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });
});
