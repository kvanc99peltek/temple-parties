/**
 * Pill — the small uppercase badge used all over the redesign.
 *
 * One component, four "tones" (color treatments), so every badge in the app
 * shares the exact same shape and typography:
 *  - hyped:   yellow with near-black text and the app's ONE glow. Reserved for
 *             the HYPED badge — nothing else in the UI is allowed to glow.
 *  - accent:  solid purple. Category tags ("FRAT PARTY") and anything that
 *             should read as a brand-colored label.
 *  - neutral: grey outline. Secondary tags that shouldn't compete for attention.
 *  - overlay: translucent black. For pills that sit ON TOP of imagery (the
 *             SHARE pill over the party-page poster) and need their own
 *             backdrop to stay readable.
 *
 * Renders a real <button> only when onClick is passed — otherwise a <span>,
 * so we never put an interactive element in the DOM that does nothing.
 */

import type { ReactNode } from 'react';

export type PillTone = 'hyped' | 'accent' | 'neutral' | 'overlay';

interface PillProps {
  children: ReactNode;
  tone: PillTone;
  /** xs = card badges (tiny), sm = party-page tags and the SHARE pill. */
  size?: 'xs' | 'sm';
  /** round = full pill (party page), square = subtle 4px corners (feed badge). */
  shape?: 'round' | 'square';
  onClick?: () => void;
  /** Hover tooltip (also used as the accessible label when clickable). */
  title?: string;
  className?: string;
}

const TONE_CLASSES: Record<PillTone, string> = {
  hyped: 'bg-temple-hyped text-temple-hyped-ink shadow-hyped-glow',
  accent: 'bg-temple-purple text-white',
  neutral: 'border border-temple-muted text-temple-muted',
  overlay: 'border border-white/25 bg-black/60 text-white',
};

export default function Pill({
  children,
  tone,
  size = 'xs',
  shape = 'round',
  onClick,
  title,
  className = '',
}: PillProps) {
  const classes = [
    'inline-flex items-center justify-center uppercase font-montserrat font-bold whitespace-nowrap',
    // Sizes come straight off the Figma frames (8.5–10px with wide tracking).
    size === 'xs' ? 'text-[8.5px] tracking-[0.68px] px-[7px] py-[3px]' : 'text-[10px] tracking-[0.8px] px-3 py-1.5',
    shape === 'round' ? 'rounded-full' : 'rounded',
    TONE_CLASSES[tone],
    className,
  ].join(' ');

  // Only a real button when it actually does something (no dead interactive DOM).
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={classes}>
        {children}
      </button>
    );
  }
  return (
    <span title={title} className={classes}>
      {children}
    </span>
  );
}
