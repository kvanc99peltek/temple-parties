'use client';

/**
 * BottomNav — the app's chrome: a 4-tab bottom bar on mobile (Home / Map /
 * Ranks / Profile, per the WF-B2 redesign) and a fixed top bar on desktop.
 *
 * On /demo/* paths every link swaps to its demo twin (and Profile is hidden)
 * so the read-only demo can never leak into the live app.
 *
 * The Profile tab is the login entry point too: logged-out visitors who tap
 * it hit /profile, which redirects them to /login — no separate login link
 * needed anywhere else.
 *
 * `desktopOnly` supports "pushed" routes (the party page): they suppress the
 * mobile tab bar in favor of a back arrow + their own sticky action bar,
 * while desktop keeps its top bar.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Wordmark from '@/components/ui/Wordmark';

type NavKey = 'home' | 'map' | 'rankings' | 'profile';

// Inline SVGs (stroke = currentColor) so the active tint is pure CSS —
// no separate "-active" asset needed per icon like the old PNG approach.
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[22px]" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 20.5v-7h5v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[22px]" aria-hidden>
      <path d="M9 18.5 3 21V6l6-2.5M9 18.5 15 21M9 18.5V3.5M15 21l6-2.5V4l-6 2.5M15 21V6.5M15 6.5 9 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RanksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[22px]" aria-hidden>
      <path d="M8 20V10M12 20V4M16 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-[22px]" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<NavKey, () => ReactNode> = {
  home: HomeIcon,
  map: MapIcon,
  rankings: RanksIcon,
  profile: ProfileIcon,
};

// icon/iconActive file paths survive only for the desktop bar, which still
// uses the original SVG assets next to its text labels.
const MAIN_NAV: { key: NavKey; href: string; label: string; icon: string; iconActive: string }[] = [
  {
    key: 'home',
    href: '/',
    label: 'Home',
    icon: '/icons/home.svg',
    iconActive: '/icons/home-active.svg',
  },
  {
    key: 'map',
    href: '/map',
    label: 'Map',
    icon: '/icons/map.svg',
    iconActive: '/icons/map-active.svg',
  },
  {
    key: 'rankings',
    href: '/leaderboards',
    label: 'Ranks',
    icon: '/icons/leaderboards.svg',
    iconActive: '/icons/leaderboards-active.svg',
  },
  {
    key: 'profile',
    href: '/profile',
    label: 'Profile',
    icon: '',
    iconActive: '',
  },
];

const DEMO_NAV = MAIN_NAV.filter((item) => item.key !== 'profile').map((item) => ({
  ...item,
  href:
    item.key === 'home'
      ? '/demo'
      : item.key === 'map'
        ? '/demo/map'
        : '/demo/leaderboards',
}));

function isDemoPath(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/');
}

function activeKeyFromPath(pathname: string): NavKey {
  if (pathname === '/map' || pathname === '/demo/map' || pathname.startsWith('/map/')) return 'map';
  if (
    pathname === '/leaderboards' ||
    pathname === '/demo/leaderboards' ||
    pathname.startsWith('/leaderboards/')
  ) {
    return 'rankings';
  }
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  return 'home';
}

export default function BottomNav({ desktopOnly = false }: { desktopOnly?: boolean }) {
  const pathname = usePathname() ?? '/';
  const demo = isDemoPath(pathname);
  const nav = demo ? DEMO_NAV : MAIN_NAV;
  const active = activeKeyFromPath(pathname);
  const homeHref = demo ? '/demo' : '/';

  return (
    <>
      {/* Desktop top bar — always present so big screens keep persistent nav. */}
      <nav
        className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-[#0b0b0b]/95 backdrop-blur-md border-b border-white/10 items-center px-8"
        style={{ zIndex: 9999 }}
      >
        <Link href={homeHref}>
          <Wordmark />
        </Link>

        <div className="ml-auto flex items-center gap-8">
          {nav.map((item) => {
            const isActive = active === item.key;
            const desktopLabel = item.key === 'rankings' ? 'Leaderboards' : item.label;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-2 text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
                  isActive ? 'text-temple-purple' : 'text-white/60 hover:text-white'
                }`}
              >
                {item.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={isActive ? item.iconActive : item.icon}
                    alt=""
                    className="w-6 h-6"
                  />
                )}
                {desktopLabel}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile tab bar — suppressed on pushed routes via desktopOnly. */}
      {!desktopOnly && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-temple-surface border-t border-white/10"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-start justify-between px-8 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {nav.map((item) => {
              const isActive = active === item.key;
              const Icon = ICONS[item.key];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 min-w-[44px] transition-colors duration-200 ${
                    isActive ? 'text-temple-purple' : 'text-temple-muted'
                  }`}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon />
                  <span className="font-montserrat font-medium text-[10px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
