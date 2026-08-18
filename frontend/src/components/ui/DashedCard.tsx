/**
 * DashedCard — a dashed-outline container for "special slot" content that
 * should read as distinct from normal cards: the promo-code ticket, the
 * SPONSORED ad slot, and the logged-out address gate.
 *
 * The dashed border is the shared visual cue ("this is a coupon / a slot"),
 * so all three surfaces use this one wrapper instead of three hand-rolled
 * borders that would drift apart.
 */

import type { ReactNode } from 'react';

export default function DashedCard({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const classes = `w-full border border-dashed border-white/25 rounded-[12px] ${className}`;

  // Same rule as Pill: only a real <button> when the whole card is tappable.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} text-left`}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}
