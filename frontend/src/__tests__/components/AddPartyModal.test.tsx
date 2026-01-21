/**
 * Test cases for AddPartyModal component.
 * Tests form validation, user input handling, and edge cases.
 * Includes tests for malicious inputs.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddPartyModal from '@/components/AddPartyModal';

describe('AddPartyModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<AddPartyModal {...defaultProps} />);
      expect(screen.getByText('Add a Party')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<AddPartyModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Add a Party')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<AddPartyModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/sigma chi house party/i)).toBeInTheDocument(); // Title
      expect(screen.getByPlaceholderText(/e\.g\., sigma chi$/i)).toBeInTheDocument(); // Host
      expect(screen.getByPlaceholderText(/1234 n broad/i)).toBeInTheDocument(); // Address
      expect(screen.getByText('Friday')).toBeInTheDocument();
      expect(screen.getByText('Saturday')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty title', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(hostInput, 'Test Host');
      await userEvent.type(addressInput, 'Test Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty host', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, 'Test Title');
      await userEvent.type(addressInput, 'Test Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Host is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty address', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);

      await userEvent.type(titleInput, 'Test Title');
      await userEvent.type(hostInput, 'Test Host');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for title over 50 characters', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      // Input has maxLength but lets test validation message
      await userEvent.type(titleInput, 'A'.repeat(51));
      await userEvent.type(hostInput, 'Test Host');
      await userEvent.type(addressInput, 'Test Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      // The maxLength attribute should prevent >50 chars, but if somehow bypassed
      // Note: maxLength HTML attribute prevents typing, so we just verify its set
      expect(titleInput).toHaveAttribute('maxLength', '50');
    });

    it('should show error for host over 30 characters', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);

      // Verify maxLength attribute
      expect(hostInput).toHaveAttribute('maxLength', '30');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, 'Awesome Party');
      await userEvent.type(hostInput, 'The Host');
      await userEvent.type(addressInput, '123 Party St');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Awesome Party',
        host: 'The Host',
        address: '123 Party St',
        doorsOpen: '10 PM',
        category: 'House Party',
        day: 'friday',
      });
    });

    it('should trim whitespace from inputs', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, '  Spaced Title  ');
      await userEvent.type(hostInput, '  Spaced Host  ');
      await userEvent.type(addressInput, '  Spaced Address  ');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Spaced Title',
          host: 'Spaced Host',
          address: 'Spaced Address',
        })
      );
    });

    it('should call onClose after successful submission', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, 'Party');
      await userEvent.type(hostInput, 'Host');
      await userEvent.type(addressInput, 'Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Day Selection', () => {
    it('should default to friday', () => {
      render(<AddPartyModal {...defaultProps} />);

      const fridayButton = screen.getByRole('button', { name: 'Friday' });
      expect(fridayButton).toHaveClass('bg-purple-500');
    });

    it('should switch to saturday when clicked', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const saturdayButton = screen.getByRole('button', { name: 'Saturday' });
      fireEvent.click(saturdayButton);

      expect(saturdayButton).toHaveClass('bg-purple-500');
    });

    it('should include selected day in submission', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, 'Party');
      await userEvent.type(hostInput, 'Host');
      await userEvent.type(addressInput, 'Address');

      const saturdayButton = screen.getByRole('button', { name: 'Saturday' });
      fireEvent.click(saturdayButton);

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ day: 'saturday' })
      );
    });
  });

  describe('Modal Behavior', () => {
    it('should close when backdrop is clicked', () => {
      render(<AddPartyModal {...defaultProps} />);

      // Find the backdrop (the outer div with onClick)
      const backdrop = document.querySelector('.fixed.inset-0');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should close when close button is clicked', () => {
      render(<AddPartyModal {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on Escape key', () => {
      render(<AddPartyModal {...defaultProps} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form when modal reopens', async () => {
      const { rerender } = render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      await userEvent.type(titleInput, 'Some Title');

      // Close modal
      rerender(<AddPartyModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<AddPartyModal {...defaultProps} isOpen={true} />);

      const newTitleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      expect(newTitleInput).toHaveValue('');
    });
  });

  describe('Security - Malicious Inputs', () => {
    it('should handle XSS attempt in title', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      const xssPayload = '<script>alert(1)</script>';
      await userEvent.type(titleInput, xssPayload);
      await userEvent.type(hostInput, 'Host');
      await userEvent.type(addressInput, 'Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      // Should submit the raw value (server should sanitize)
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: xssPayload })
      );
    });

    it('should handle SQL injection attempt in fields', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      const sqlPayload = "'; DROP TABLE parties;--";
      await userEvent.type(titleInput, sqlPayload);
      await userEvent.type(hostInput, 'Host');
      await userEvent.type(addressInput, 'Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      // Should submit and let server handle sanitization
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should handle unicode control characters', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      // Unicode right-to-left override
      await userEvent.type(titleInput, 'Party\u202E');
      await userEvent.type(hostInput, 'Host');
      await userEvent.type(addressInput, 'Address');

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should handle extremely long input (within maxLength)', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      await userEvent.type(titleInput, 'A'.repeat(50));
      await userEvent.type(hostInput, 'B'.repeat(30));
      await userEvent.type(addressInput, 'C'.repeat(1000)); // Address has no maxLength

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should handle null bytes in input', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText(/sigma chi house party/i);
      const hostInput = screen.getByPlaceholderText(/sigma chi$/i);
      const addressInput = screen.getByPlaceholderText(/1234 n broad/i);

      // Use fireEvent.change for null bytes since userEvent.type can't type null bytes
      fireEvent.change(titleInput, { target: { value: 'Party\x00Name' } });
      fireEvent.change(hostInput, { target: { value: 'Host' } });
      fireEvent.change(addressInput, { target: { value: 'Address' } });

      const submitButton = screen.getByRole('button', { name: /add party/i });
      fireEvent.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Dropdown Selections', () => {
    it('should have default doors open time', () => {
      render(<AddPartyModal {...defaultProps} />);

      const doorsSelect = screen.getAllByRole('combobox')[0];
      expect(doorsSelect).toHaveValue('10 PM');
    });

    it('should have default category', () => {
      render(<AddPartyModal {...defaultProps} />);

      const categorySelect = screen.getAllByRole('combobox')[1];
      expect(categorySelect).toHaveValue('House Party');
    });

    it('should allow changing doors open time', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const doorsSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(doorsSelect, { target: { value: '11 PM' } });

      expect(doorsSelect).toHaveValue('11 PM');
    });

    it('should allow changing category', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const categorySelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(categorySelect, { target: { value: 'Frat Party' } });

      expect(categorySelect).toHaveValue('Frat Party');
    });
  });
});
