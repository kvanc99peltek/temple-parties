/**
 * SectionLabel — the small tracked-out uppercase heading that introduces a
 * section of content ("ALSO TONIGHT · 5", "FROM THE HOST", "WAS IT GOOD?").
 *
 * The wide letter-spacing + muted grey is what makes these read as quiet
 * structural labels instead of content — keeping them identical everywhere
 * is what makes the feed and the party page feel like one system.
 */

import type { ReactNode } from 'react';

export default function SectionLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-montserrat font-bold text-[11px] tracking-[1.1px] uppercase text-temple-muted ${className}`}
    >
      {children}
    </p>
  );
}
