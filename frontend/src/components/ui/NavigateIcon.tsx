/**
 * NavigateIcon — the classic tuparties "paper plane" navigate glyph.
 *
 * Same path as public/icons/navigate.svg, but inlined and rendered as a
 * SOLID shape: fill + stroke are both currentColor (the stroke keeps the
 * rounded corners of the original), so the plane takes whatever color its
 * button sets — brand purple on the standard navigate button. The <img>
 * version can't do that — its color is baked into the file.
 */

export default function NavigateIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 17.8334 17.8334" className={className} aria-hidden>
      <path
        d="M1.00002 8.50003L16.8334 1.00003L9.33336 16.8334L7.66669 10.1667L1.00002 8.50003Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
