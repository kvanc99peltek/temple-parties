/**
 * Test cases for AddPartyModal component.
 * Keep minimal — this modal is replaced in epic 8.
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
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as jest.Mock;
  });

  const fillRequiredFields = async (overrides?: {
    title?: string;
    host?: string;
    pinLabel?: string;
    address?: string;
  }) => {
    const title = overrides?.title ?? 'Awesome Party';
    const host = overrides?.host ?? 'The Host';
    const pinLabel = overrides?.pinLabel ?? 'SC';
    const address = overrides?.address ?? '123 Party St';

    await userEvent.type(screen.getByPlaceholderText(/sigma chi house party/i), title);
    await userEvent.type(screen.getByPlaceholderText(/^e\.g\., sigma chi$/i), host);
    await userEvent.type(screen.getByPlaceholderText(/ogp/i), pinLabel);
    await userEvent.type(screen.getByPlaceholderText(/start typing address/i), address);
  };

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
      expect(screen.getByPlaceholderText(/sigma chi house party/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/^e\.g\., sigma chi$/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ogp/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/start typing address/i)).toBeInTheDocument();
      expect(screen.getByText(/doors open/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty title', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await userEvent.type(screen.getByPlaceholderText(/^e\.g\., sigma chi$/i), 'Test Host');
      await userEvent.type(screen.getByPlaceholderText(/ogp/i), 'TH');
      await userEvent.type(screen.getByPlaceholderText(/start typing address/i), 'Test Address');

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty host', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await userEvent.type(screen.getByPlaceholderText(/sigma chi house party/i), 'Test Title');
      await userEvent.type(screen.getByPlaceholderText(/ogp/i), 'TT');
      await userEvent.type(screen.getByPlaceholderText(/start typing address/i), 'Test Address');

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(screen.getByText('Host is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for empty address', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await userEvent.type(screen.getByPlaceholderText(/sigma chi house party/i), 'Test Title');
      await userEvent.type(screen.getByPlaceholderText(/^e\.g\., sigma chi$/i), 'Test Host');
      await userEvent.type(screen.getByPlaceholderText(/ogp/i), 'TH');

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should enforce title maxLength of 50', () => {
      render(<AddPartyModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/sigma chi house party/i)).toHaveAttribute('maxLength', '50');
    });

    it('should enforce host maxLength of 30', () => {
      render(<AddPartyModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/^e\.g\., sigma chi$/i)).toHaveAttribute('maxLength', '30');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await fillRequiredFields();

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Awesome Party',
          host: 'The Host',
          pinLabel: 'SC',
          address: '123 Party St',
          doorsOpen: '10 PM',
          category: 'House Party',
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        })
      );
    });

    it('should trim whitespace from inputs', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await fillRequiredFields({
        title: '  Spaced Title  ',
        host: '  Spaced Host  ',
        pinLabel: ' SP ',
        address: '  Spaced Address  ',
      });

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Spaced Title',
          host: 'Spaced Host',
          pinLabel: 'SP',
          address: 'Spaced Address',
        })
      );
    });

    it('should call onClose after successful submission', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await fillRequiredFields({ title: 'Party', host: 'Host', pinLabel: 'H', address: 'Address' });

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Date selection', () => {
    it('should include a date in submission', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await fillRequiredFields({ title: 'Party', host: 'Host', pinLabel: 'H', address: 'Address' });

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
      );
    });
  });

  describe('Modal Behavior', () => {
    it('should close when backdrop is clicked', () => {
      render(<AddPartyModal {...defaultProps} />);

      const backdrop = screen.getByTestId('modal-backdrop');
      fireEvent.click(backdrop);
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

      rerender(<AddPartyModal {...defaultProps} isOpen={false} />);
      rerender(<AddPartyModal {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sigma chi house party/i)).toHaveValue('');
      });
    });
  });

  describe('Security - Malicious Inputs', () => {
    it('should handle XSS attempt in title', async () => {
      render(<AddPartyModal {...defaultProps} />);

      const xssPayload = '<script>alert(1)</script>';
      await fillRequiredFields({
        title: xssPayload,
        host: 'Host',
        pinLabel: 'H',
        address: 'Address',
      });

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: xssPayload })
      );
    });

    it('should handle SQL injection attempt in fields', async () => {
      render(<AddPartyModal {...defaultProps} />);

      await fillRequiredFields({
        title: "'; DROP TABLE parties;--",
        host: 'Host',
        pinLabel: 'H',
        address: 'Address',
      });

      fireEvent.click(screen.getByRole('button', { name: /add party/i }));

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

    it('should allow changing doors open time', () => {
      render(<AddPartyModal {...defaultProps} />);

      const doorsSelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(doorsSelect, { target: { value: '11 PM' } });

      expect(doorsSelect).toHaveValue('11 PM');
    });

    it('should allow changing category', () => {
      render(<AddPartyModal {...defaultProps} />);

      const categorySelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(categorySelect, { target: { value: 'Frat Party' } });

      expect(categorySelect).toHaveValue('Frat Party');
    });
  });
});
