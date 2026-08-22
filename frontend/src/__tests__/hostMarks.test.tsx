/**
 * Host-line marks: the verified seal and the last-semester #1 chip.
 *
 * These two render side by side after a host name, so the test pins the
 * behaviour that matters for that pairing: the seal is a vector with an
 * accessible label (not an <img> pair), and the #1 crown is a real button
 * that opens its modal without navigating anywhere.
 *
 * Plain jest matchers on purpose: jest-dom's matchers are wired up at
 * runtime by jest.setup.js, but their TYPES aren't visible to `tsc`, and
 * `next build` type-checks test files too.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import VerifiedMark from '@/components/ui/VerifiedMark';
import LastSemesterChampBadge from '@/components/LastSemesterChampBadge';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));

describe('VerifiedMark', () => {
  it('renders a single inline SVG seal with an accessible label', () => {
    const { container } = render(<VerifiedMark />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('explains itself via toast on tap', () => {
    const onShowToast = jest.fn();
    render(<VerifiedMark onShowToast={onShowToast} />);
    fireEvent.click(screen.getByTitle('Verified host'));
    expect(onShowToast).toHaveBeenCalledWith('Verified host');
  });
});

describe('LastSemesterChampBadge', () => {
  it('is a static, non-clickable mark by default (feed cards)', () => {
    render(<LastSemesterChampBadge />);
    expect(screen.queryByRole('button')).toBeNull();
    const mark = screen.getByRole('img', { name: '#1 host last semester' });
    expect(mark.querySelector('svg')).toBeTruthy();
    fireEvent.click(mark);
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
  });

  it('is a labelled button that opens the modal when interactive (party page)', () => {
    render(<LastSemesterChampBadge interactive hostName="Latin Heat" />);
    const chip = screen.getByRole('button', { name: '#1 host last semester' });
    expect(chip.querySelector('svg')).toBeTruthy();
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();

    fireEvent.click(chip);
    expect(screen.getByTestId('modal-backdrop')).toBeTruthy();
    expect(screen.getByText('Latin Heat')).toBeTruthy();
    expect(screen.getByText(/#1 in the host rankings last semester/)).toBeTruthy();
  });

  it('routes to the host rankings from the modal CTA', () => {
    render(<LastSemesterChampBadge interactive />);
    fireEvent.click(screen.getByRole('button', { name: '#1 host last semester' }));
    fireEvent.click(screen.getByRole('button', { name: 'See host rankings' }));
    expect(push).toHaveBeenCalledWith('/leaderboards?filter=by-hosts');
  });

  it('closes from the modal ✕ and falls back to a generic headline without a name', () => {
    render(<LastSemesterChampBadge interactive />);
    fireEvent.click(screen.getByRole('button', { name: '#1 host last semester' }));
    expect(screen.getByText('This host')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
  });
});
