/**
 * IconButton — the square action button that holds a single glyph, most
 * importantly the navigate arrow (↗) that sits beside every GOING button.
 *
 * Two tones:
 *  - accent:  filled light-purple with a purple glyph — the "lit up" state
 *             (headliner card, and compact cards once you're marked going).
 *  - outline: hairline border with a light-purple glyph — the quiet default.
 *
 * Three sizes matching the three surfaces it appears on:
 *  sm = 34px (compact feed card) · md = 44px (headliner) · lg = 46px (sticky bar).
 *
 * The glyph is passed as children (usually a text arrow, exactly like the
 * design uses) so this stays a pure shell — no icon logic baked in.
 */

import type { ReactNode } from 'react';

interface IconButtonProps {
  /** Accessible name — becomes aria-label and the hover tooltip. */
  label: string;
  onClick: () => void;
  tone?: 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  /** Extra tooltip context (falls back to label). */
  title?: string;
  children: ReactNode;
}

const SIZE_CLASSES = {
  sm: 'size-[34px] rounded-[9px] text-[13px]',
  md: 'size-[44px] rounded-[10px] text-[15px]',
  lg: 'size-[46px] rounded-[12px] text-[16px]',
};

const TONE_CLASSES = {
  accent: 'bg-temple-purple-light text-temple-purple',
  outline: 'border border-white/15 text-temple-purple-light',
};

export default function IconButton({
  label,
  onClick,
  tone = 'outline',
  size = 'md',
  disabled = false,
  title,
  children,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={`shrink-0 flex items-center justify-center font-montserrat font-bold transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]}`}
    >
      {children}
    </button>
  );
}
