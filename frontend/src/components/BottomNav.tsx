'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavKey = 'home' | 'map' | 'rankings';

const MAIN_NAV: { key: NavKey; href: string; label: string; icon: string; iconActive: string; mobileClass: string }[] = [
  {
    key: 'home',
    href: '/',
    label: 'Home',
    icon: '/icons/home.svg',
    iconActive: '/icons/home-active.svg',
    mobileClass: 'w-10 h-10',
  },
  {
    key: 'map',
    href: '/map',
    label: 'Map',
    icon: '/icons/map.svg',
    iconActive: '/icons/map-active.svg',
    mobileClass: 'w-10 h-10',
  },
  {
    key: 'rankings',
    href: '/leaderboards',
    label: 'Leaderboards',
    icon: '/icons/leaderboards.svg',
    iconActive: '/icons/leaderboards-active.svg',
    mobileClass: 'w-[26px] h-[31px]',
  },
];

const DEMO_NAV = MAIN_NAV.map((item) => ({
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
  return 'home';
}

export default function BottomNav() {
  const pathname = usePathname() ?? '/';
  const demo = isDemoPath(pathname);
  const nav = demo ? DEMO_NAV : MAIN_NAV;
  const active = activeKeyFromPath(pathname);
  const homeHref = demo ? '/demo' : '/';

  return (
    <>
      {/* Desktop top bar — hidden below lg */}
      <nav
        className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-[#0b0b0b]/95 backdrop-blur-md border-b border-white/10 items-center px-8"
        style={{ zIndex: 9999 }}
      >
        <Link href={homeHref} className="text-[28px] font-normal text-white font-bitcount leading-none">
          Temple<br />Parties
        </Link>

        <div className="ml-auto flex items-center gap-8">
          {nav.map((item) => {
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-2 text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
                  isActive ? 'text-[#b24bf3]' : 'text-white/60 hover:text-white'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isActive ? item.iconActive : item.icon}
                  alt=""
                  className="w-6 h-6"
                />
                {item.label}
              </Link>
            );
          })}
          {!demo && (
            <Link
              href="/profile"
              className={`text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
                pathname === '/profile' || pathname.startsWith('/profile/')
                  ? 'text-[#b24bf3]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Profile
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile pill — hidden at lg+ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0" style={{ zIndex: 9999 }}>
        <div
          className="absolute inset-x-0 bottom-0 h-[100px] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, black)' }}
        />

        <div className="relative flex justify-center pb-3">
          <div className="w-[232px] h-[50px] bg-[#b24bf3] rounded-[24px] flex items-center justify-center gap-[35px]">
            {nav.map((item) => {
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="transition-opacity duration-200 hover:opacity-80"
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={isActive ? item.iconActive : item.icon}
                    alt={item.label}
                    className={item.mobileClass}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
