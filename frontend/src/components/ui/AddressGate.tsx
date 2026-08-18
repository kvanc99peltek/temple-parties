/**
 * AddressGate — decides what shows where an address belongs.
 *
 * Three possible states, in order of how much the viewer is allowed to see:
 *  1. Logged out → the server already stripped the address (it arrives as
 *     null), so we render a "Sign in to view address" link. The address is
 *     the carrot that drives signups — everything else stays browsable.
 *  2. Logged in but not yet revealed → "View address" (revealing is a
 *     deliberate tap so we can count real address intent, and on some flows
 *     it auto-marks you as going).
 *  3. Revealed → the street line itself, with a quick fade-in right after
 *     the reveal tap so the swap doesn't feel like a glitch.
 */

interface AddressGateProps {
  /** Full address from the API — null means the server soft-gated it. */
  address: string | null;
  /** Has this viewer tapped to reveal this party's address yet? */
  isRevealed: boolean;
  /** Play the fade-in (true right after a reveal tap). */
  animateReveal?: boolean;
  onViewAddress: () => void;
  /** street = first line only (cards) · full = the whole thing (party page). */
  display?: 'street' | 'full';
}

export default function AddressGate({
  address,
  isRevealed,
  animateReveal = false,
  onViewAddress,
  display = 'street',
}: AddressGateProps) {
  const streetLine = address ? address.split(',')[0] : null;
  const shown = display === 'street' ? streetLine : address;
  const canShow = isRevealed && !!shown;

  if (!canShow) {
    return (
      <button
        type="button"
        onClick={onViewAddress}
        className="underline underline-offset-2 hover:text-white/90 transition-colors"
      >
        {address === null ? 'Sign in to view address' : 'View address'}
      </button>
    );
  }

  return <span className={`truncate ${animateReveal ? 'animate-fade-in' : ''}`}>{shown}</span>;
}
