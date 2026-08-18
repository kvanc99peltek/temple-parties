'use client';

/**
 * SponsoredSlot — the dashed "SPONSORED" strip between the headliner and
 * the ALSO TONIGHT list (WF-B2's ad slot).
 *
 * Driven entirely by lib/sponsors.ts: a sponsor in the SPONSORS array
 * renders here; an empty array renders nothing (no deal = no ad box).
 * Tapping the strip opens the sponsor's order page.
 */

import DashedCard from '@/components/ui/DashedCard';
import { PRIMARY_SPONSOR } from '@/lib/sponsors';
import { trackEvent } from '@/utils/analytics';

export default function SponsoredSlot() {
  if (!PRIMARY_SPONSOR) return null;
  const sponsor = PRIMARY_SPONSOR;

  const handleClick = () => {
    trackEvent('sponsor_slot_clicked', { sponsor: sponsor.id });
    if (sponsor.orderUrl) window.open(sponsor.orderUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mb-3">
      <DashedCard onClick={handleClick} className="flex items-center gap-2.5 pl-2.5 pr-3 py-2.5">
        {/* Mini "pin" mark so the slot rhymes with the sponsor's map pin. */}
        <div className="size-7 shrink-0 rounded-[6px] bg-temple-purple-light flex items-center justify-center">
          <span className="font-montserrat font-extrabold text-[11px] text-black leading-none">
            {sponsor.pinLabel}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-montserrat font-bold text-[9.5px] tracking-[0.95px] uppercase text-temple-muted">
            SPONSORED
          </p>
          <p className="font-montserrat font-semibold text-[13px] text-white truncate">
            {sponsor.name} · <span className="text-temple-purple-light font-medium">{sponsor.popupDescription}</span>
          </p>
        </div>
      </DashedCard>
    </div>
  );
}
