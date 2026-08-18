'use client';

/**
 * SponsoredSlot — the dashed "SPONSORED" placeholder between the headliner
 * and the ALSO TONIGHT list (WF-B2's ad slot).
 *
 * The sponsor system (banner, map pin, reminder — see lib/sponsors.ts and
 * the commented blocks it points to) was fully built for the chicken-shop
 * deal and then pulled when the deal fell through. Until a new sponsor
 * signs, ACTIVE_SPONSOR stays null and this component renders nothing —
 * the feed shows no empty ad box to real users.
 *
 * Reviving it is one edit: fill in ACTIVE_SPONSOR below (and optionally
 * uncomment the richer system in lib/sponsors.ts for the map pin).
 */

import DashedCard from '@/components/ui/DashedCard';
import { trackEvent } from '@/utils/analytics';

interface SponsorSlotContent {
  name: string;
  tagline: string;
  /** Where tapping the slot goes (order page, IG, etc.). */
  url?: string;
  logoUrl?: string;
}

// Null = no active sponsor deal → the slot doesn't render at all.
const ACTIVE_SPONSOR: SponsorSlotContent | null = null;

export default function SponsoredSlot() {
  if (!ACTIVE_SPONSOR) return null;
  const sponsor: SponsorSlotContent = ACTIVE_SPONSOR;

  const handleClick = () => {
    trackEvent('sponsor_slot_clicked', { sponsor: sponsor.name });
    if (sponsor.url) window.open(sponsor.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mb-3">
      <DashedCard onClick={handleClick} className="flex items-center gap-2.5 pl-2.5 pr-3 py-2">
        {sponsor.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.logoUrl} alt="" className="size-7 rounded-[6px] object-cover shrink-0" />
        ) : (
          <div className="size-7 rounded-[6px] bg-[#262626] shrink-0" />
        )}
        <p className="font-montserrat font-medium text-[11px] text-temple-muted truncate">
          SPONSORED · {sponsor.name} — {sponsor.tagline}
        </p>
      </DashedCard>
    </div>
  );
}
