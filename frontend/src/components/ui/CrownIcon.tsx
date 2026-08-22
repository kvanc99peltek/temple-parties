/**
 * CrownIcon — the gold crown that marks last semester's #1 host.
 *
 * Drawn in a 24-box: three peaks with a band underneath. The fill is
 * outlined in the same color with round joins, which is a cheap way to
 * soften the points so they don't sparkle at 16px. Color comes from
 * `currentColor`, so the parent sets it (`text-temple-hyped` everywhere it
 * ships — gold is what "#1" means in this app).
 *
 * Used at 16px beside host names (LastSemesterChampBadge). The explainer
 * modal's hero is `CrownIllustration` — same five-peak silhouette, drawn
 * with the gradients/gems that only read at 64px+.
 */

export default function CrownIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`block ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 18.5V7.5L7.6 12 12 4.5 16.4 12 21.5 7.5V18.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="2.5" y="19.2" width="19" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}
