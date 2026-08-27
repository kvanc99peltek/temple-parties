/**
 * Pure HTML builders for the two map pins.
 *
 * Leaflet draws markers from raw HTML strings (`L.divIcon`), outside React —
 * that's why these are string builders, why their styles live in
 * `globals.css` instead of Tailwind, and why every piece of host-entered
 * text is escaped before it goes in. Keeping the builders free of Leaflet
 * means they're plain functions we can unit-test.
 *
 * Two pins (Figma §13, WF-M4 "pin states"):
 *  - disc: full-purple circle + hanging count badge. Unverified / free hosts.
 *  - ring: white plate, purple ring, stem, hanging count. Verified hosts
 *    (stand-in for the paid layer). States layer on top of it:
 *      selected  → white focus ring, pin scales up ~1.15×
 *      going     → ✓ on the badge
 *      headliner → thin HEADLINER-yellow halo + ★ badge
 *      live      → slow pulse ring
 *      over      → dimmed
 *      muted     → faded because another pin is selected (sheet open)
 */

import type { HostBrand } from './mapHelpers';

/** Never put host-entered text into raw HTML unescaped. */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (c) => map[c]);
}

/** "#b24bf3" + 0.35 → "rgba(178, 75, 243, 0.35)". Non-hex input falls back to the input. */
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** The pin label: the host's pin_label if they set one, otherwise their initials. */
export function pinLabelFor(pinLabel: string, host: string): string {
  if (pinLabel) return pinLabel.toUpperCase();
  return host
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/* ---------------------------------- ring ---------------------------------- */

/** The ring pin is drawn in a 72×72 cell (the Figma "pin cell"). */
export const RING_PIN_SIZE = 72;
/** The stem tip is the party's exact location; the pin body floats above it. */
export const RING_PIN_ANCHOR: [number, number] = [36, 72];

export type RingPinOptions = {
  initials: string;
  /** Going count; null when the server gated it (logged out) — badge is hidden. */
  count: number | null;
  brand: HostBrand;
  isSelected?: boolean;
  isGoing?: boolean;
  isHyped?: boolean;
  isLive?: boolean;
  isDimmed?: boolean;
  isMuted?: boolean;
  /** Persistent "HOST · 11 PM" chip beside the pin (zoom ladder ≥ 16). */
  chip?: string | null;
};

export function ringPinHtml(o: RingPinOptions): string {
  const initials = escapeHtml(o.initials.toUpperCase().slice(0, 4));
  // The plate is 42px wide: shrink the type as the initials get longer.
  const fontSize = initials.length <= 1 ? 16 : initials.length === 2 ? 13 : initials.length === 3 ? 11 : 9;

  const classes = [
    'ring-pin',
    o.isSelected && 'is-selected',
    o.isGoing && 'is-going',
    o.isHyped && 'is-hyped',
    o.isLive && 'is-live',
    o.isDimmed && 'is-dimmed',
    o.isMuted && 'is-muted',
  ]
    .filter((c): c is string => Boolean(c))
    .join(' ');

  // Brand slots become CSS variables — globals.css does the colouring.
  const vars = [
    `--pin-primary:${o.brand.primary}`,
    `--pin-secondary:${o.brand.secondary}`,
    `--pin-accent:${o.brand.accent}`,
    `--pin-accent-ink:${o.brand.accentInk}`,
    `--pin-glow:${hexToRgba(o.brand.primary, 0.35)}`,
  ].join(';');

  const badgeText = pinCountBadgeText(o.count, o.isGoing);

  return [
    `<div class="${classes}" style="${vars}">`,
    o.isLive ? '<span class="ring-pin__pulse"></span>' : '',
    '<span class="ring-pin__glow"></span>',
    o.isHyped ? '<span class="ring-pin__halo"></span>' : '',
    o.isSelected ? '<span class="ring-pin__focus"></span>' : '',
    '<span class="ring-pin__ring"></span>',
    `<span class="ring-pin__plate" style="font-size:${fontSize}px">${initials}</span>`,
    '<span class="ring-pin__stem"></span>',
    badgeText ? `<span class="ring-pin__badge pin-count-badge">${badgeText}</span>` : '',
    o.isHyped ? '<span class="ring-pin__star">★</span>' : '',
    o.chip ? `<span class="ring-pin__chip">${escapeHtml(o.chip)}</span>` : '',
    '</div>',
  ].join('');
}

/* ---------------------------------- disc ---------------------------------- */

export const DISC_PIN_MIN = 44;
export const DISC_PIN_MAX = 64;
/** Extra Leaflet cell so the count badge can hang off the SE corner without clipping. */
export const DISC_BADGE_OVERHANG = 14;

/** Soft-gate: a null count is gated, not zero — no badge (unless you're going, then ✓). */
export function pinCountBadgeText(count: number | null, isGoing?: boolean): string {
  if (isGoing) return count === null ? '✓' : `✓ ${count}`;
  if (count === null) return '';
  return String(count);
}

/** Busier parties get a bigger disc: 44px at zero share of the night's max, 64px at the max. */
export function discPinSize(count: number, maxCount: number): number {
  const ratio = Math.min(count / Math.max(maxCount, 1), 1);
  return DISC_PIN_MIN + ratio * (DISC_PIN_MAX - DISC_PIN_MIN);
}

/** Leaflet icon box for a disc: the circle plus room for the hanging count badge. */
export function discPinCellSize(size: number): number {
  return size + DISC_BADGE_OVERHANG;
}

/**
 * Where the disc's count badge sits: the same spot the ring pin's badge
 * uses, tucked half over the circle's bottom-right rim. On the ring that
 * point is 0.92 × radius from the centre, 45° toward the SE — so for a
 * circle of radius R the badge's CENTRE lands at (1.65 R, 1.65 R).
 * Returned once because it's the same on both axes; CSS translates the
 * badge back by half its own size so this really is its centre.
 */
export function discBadgeCenter(size: number): number {
  return Math.round(size * 0.825 * 10) / 10;
}

export type DiscPinOptions = {
  label: string;
  /** Going count; null when gated — the count line is left out (no fake zero). */
  count: number | null;
  size: number;
  isSelected?: boolean;
  isGoing?: boolean;
  isHyped?: boolean;
  isDimmed?: boolean;
  isMuted?: boolean;
};

export function discPinHtml(o: DiscPinOptions): string {
  const label = escapeHtml(o.label.toUpperCase());
  // Size range is 44–64px; one line of initials now that the count lives on the badge.
  const fontSize = o.size <= 50 ? 10 : o.size <= 57 ? 11 : 12;
  const cell = discPinCellSize(o.size);

  const wrapClasses = [
    'disc-pin',
    o.isDimmed && 'is-dimmed',
    o.isMuted && 'is-muted',
  ]
    .filter((c): c is string => Boolean(c))
    .join(' ');

  const classes = [
    'avatar-marker',
    o.isHyped && 'avatar-marker-pulse',
    o.isGoing && 'avatar-marker-going',
    o.isSelected && 'avatar-marker-selected',
  ]
    .filter((c): c is string => Boolean(c))
    .join(' ');

  const badgeText = pinCountBadgeText(o.count, o.isGoing);
  const badgeAt = discBadgeCenter(o.size);

  return [
    `<div class="${wrapClasses}" style="width:${cell}px;height:${cell}px;">`,
    `<div class="${classes}" style="width:${o.size}px;height:${o.size}px;">`,
    `<span class="disc-pin__label" style="font-size:${fontSize}px">${label}</span>`,
    '</div>',
    badgeText
      ? `<span class="disc-pin__badge pin-count-badge" style="left:${badgeAt}px;top:${badgeAt}px">${badgeText}</span>`
      : '',
    '</div>',
  ].join('');
}
