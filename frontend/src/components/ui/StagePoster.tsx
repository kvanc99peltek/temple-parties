/**
 * StagePoster — the "cinema stage" poster treatment (Figma M1 "blur-fill").
 *
 * Party flyers are portrait; the stage slot is landscape-ish. Instead of
 * cropping the art (never crop the art), the poster renders whole and
 * centered, and the SAME image — scaled up and heavily blurred — fills the
 * empty sides as glowing "wings". Each poster tints its own stage for free.
 *
 * Performance note: this is a one-time CSS filter on a static <img>, NOT a
 * backdrop-filter (live blur over scrolling content — banned for perf).
 * Exactly one StagePoster renders per page (headliner card / party hero),
 * so the single rasterization is cheap. If low-end devices ever struggle,
 * the seam is ready: add a `blurSrc` prop with a server-pre-baked blurred
 * image and swap it in for the CSS-blurred copy.
 *
 * No poster? A quiet purple gradient with the party title stands in.
 */

import Image from 'next/image';
import type { ReactNode } from 'react';

interface StagePosterProps {
  src?: string;
  /** Party title — used for alt text and the no-poster fallback. */
  title: string;
  /** Tailwind height class for the stage slot. 260px feed / 320px party hero. */
  heightClass?: string;
  /** Set on above-the-fold heroes so next/image loads it eagerly. */
  priority?: boolean;
  /** Overlay slot rendered on top of the stage (party-page back/share bar). */
  children?: ReactNode;
}

export default function StagePoster({
  src,
  title,
  heightClass = 'h-[260px]',
  priority = false,
  children,
}: StagePosterProps) {
  return (
    <div className={`relative w-full overflow-hidden bg-[#0d0a16] ${heightClass}`}>
      {src ? (
        <>
          {/* The wings: same poster, blown up + blurred. aria-hidden because
              it's purely decorative — the real poster is right on top of it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover blur-2xl scale-125 opacity-70"
          />
          {/* The poster itself: object-contain guarantees it never crops. */}
          <Image
            src={src}
            alt={`${title} poster`}
            fill
            sizes="(max-width: 768px) 100vw, 576px"
            className="object-contain z-[1]"
            priority={priority}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-temple-purple/30 to-[#252525] flex items-center justify-center">
          <span className="text-white/20 font-montserrat font-bold text-2xl text-center px-4 leading-tight">
            {title}
          </span>
        </div>
      )}
      {/* Anything overlaid on the stage (back/share pills) sits above the art. */}
      {children && <div className="absolute inset-0 z-[2] pointer-events-none [&>*]:pointer-events-auto">{children}</div>}
    </div>
  );
}
