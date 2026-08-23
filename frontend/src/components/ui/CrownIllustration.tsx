'use client';

/**
 * CrownIllustration — the detailed, "jewelled" crown for hero moments.
 *
 * This is the big sibling of `CrownIcon`. The 16px icon beside host names is
 * a flat silhouette because detail turns to mush at that size; this one is
 * built for 64–96px (the explainer modal), where gradients, faceted peaks,
 * pearl tips and gems actually read. Same five-peak silhouette so the two
 * are obviously the same object.
 *
 * Color: the gold stops are tints and shades of the hyped accent
 * (`--temple-hyped` = #FFD60A) and the gems are tints/shades of the brand
 * purple (#b24bf3). They're literal hex because an illustration needs a
 * highlight + base + shadow per material and the palette only has the base
 * tokens — the base stops read the CSS var, so a palette change still moves
 * the whole crown. No drop-shadow/glow: HEADLINER keeps the app's one glow.
 *
 * Gradient ids are scoped with useId so two crowns on one page can't steal
 * each other's fills (SVG gradient refs are document-global).
 */

import { useId } from 'react';

const BODY_PATH = 'M18 78V36L28.5 58L39 28L49.5 52L60 16L70.5 52L81 28L91.5 58L102 36V78Z';

export default function CrownIllustration({ size = 72, className = '' }: { size?: number; className?: string }) {
  // useId() returns ":r1:" style tokens; strip the colons so url(#…) stays clean.
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `crown-${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`block ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1A8" />
          <stop offset="0.38" style={{ stopColor: 'var(--temple-hyped)' }} />
          <stop offset="1" stopColor="#C48F00" />
        </linearGradient>
        <linearGradient id={id('band')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE766" />
          <stop offset="0.55" style={{ stopColor: 'var(--temple-hyped)' }} />
          <stop offset="1" stopColor="#A67B00" />
        </linearGradient>
        {/* Shade that gathers where the body meets the band. */}
        <linearGradient id={id('depth')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id={id('pearl')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#FFEB80" />
          <stop offset="1" stopColor="#B98600" />
        </radialGradient>
        <radialGradient id={id('gem')} cx="0.35" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#F4ECFF" />
          <stop offset="0.28" stopColor="#CF8CFF" />
          <stop offset="0.65" stopColor="#b24bf3" />
          <stop offset="1" stopColor="#4E0F85" />
        </radialGradient>
        <clipPath id={id('clip')}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      {/* Crown body — stroked in its own gradient so the peaks get round tips. */}
      <path d={BODY_PATH} fill={url('body')} stroke={url('body')} strokeWidth="3" strokeLinejoin="round" />

      {/* Facets: the left face of each peak catches light, the right falls into shade. */}
      <g clipPath={url('clip')}>
        <g fill="#FFFFFF" fillOpacity="0.26">
          <path d="M28.5 58L39 28L39 78L28.5 78Z" />
          <path d="M49.5 52L60 16L60 78L49.5 78Z" />
          <path d="M70.5 52L81 28L81 78L70.5 78Z" />
          <path d="M91.5 58L102 36L102 78L91.5 78Z" />
        </g>
        <g fill="#000000" fillOpacity="0.20">
          <path d="M18 36L28.5 58L28.5 78L18 78Z" />
          <path d="M39 28L49.5 52L49.5 78L39 78Z" />
          <path d="M60 16L70.5 52L70.5 78L60 78Z" />
          <path d="M81 28L91.5 58L91.5 78L81 78Z" />
        </g>
        {/* Soft sheen across the upper left. */}
        <ellipse cx="44" cy="40" rx="34" ry="16" fill="#FFFFFF" fillOpacity="0.14" transform="rotate(-18 44 40)" />
        <rect x="10" y="56" width="100" height="24" fill={url('depth')} />
      </g>

      {/* Side gems */}
      <circle cx="31" cy="68" r="4.2" fill={url('gem')} stroke="#FFF1A8" strokeWidth="1" strokeOpacity="0.85" />
      <circle cx="89" cy="68" r="4.2" fill={url('gem')} stroke="#FFF1A8" strokeWidth="1" strokeOpacity="0.85" />

      {/* Centre gem: rounded diamond, gold bezel, one glint. */}
      <path
        d="M60 48.5C62 48.5 70.5 58 71.5 61.5C70.5 65 62 74.5 60 74.5C58 74.5 49.5 65 48.5 61.5C49.5 58 58 48.5 60 48.5Z"
        fill={url('gem')}
        stroke="#FFF1A8"
        strokeWidth="1.6"
        strokeOpacity="0.9"
      />
      <path d="M55.5 54.5C57 53 59 52.5 60.5 52.6" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" fill="none" />

      {/* Pearls on the tips */}
      <g stroke="#A67B00" strokeOpacity="0.5" strokeWidth="0.8" fill={url('pearl')}>
        <circle cx="18" cy="35" r="4.6" />
        <circle cx="39" cy="27" r="4.6" />
        <circle cx="60" cy="14.5" r="5.6" />
        <circle cx="81" cy="27" r="4.6" />
        <circle cx="102" cy="35" r="4.6" />
      </g>

      {/* Band: highlight along the top edge, shade along the bottom, jewels + studs. */}
      <rect x="13" y="76" width="94" height="22" rx="5" fill={url('band')} />
      <rect x="13" y="76" width="94" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.35" />
      <rect x="13" y="93" width="94" height="5" rx="2.5" fill="#000000" fillOpacity="0.22" />
      <g fill={url('gem')} stroke="#FFF1A8" strokeWidth="1" strokeOpacity="0.85">
        <circle cx="34" cy="87" r="4.3" />
        <circle cx="60" cy="87" r="4.3" />
        <circle cx="86" cy="87" r="4.3" />
      </g>
      <g fill={url('pearl')}>
        <circle cx="47" cy="87" r="2" />
        <circle cx="73" cy="87" r="2" />
      </g>
    </svg>
  );
}
