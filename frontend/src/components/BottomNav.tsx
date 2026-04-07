'use client';

interface BottomNavProps {
  activeView: 'home' | 'map' | 'rankings';
  onViewChange: (view: 'home' | 'map' | 'rankings') => void;
}

export default function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0" style={{ zIndex: 9999 }}>
      {/* Gradient fade behind nav */}
      <div className="absolute inset-x-0 bottom-0 h-[100px] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, black)' }} />

      {/* Centered pill */}
      <div className="relative flex justify-center pb-3">
        <div className="w-[232px] h-[50px] bg-[#b24bf3] rounded-[24px] flex items-center justify-center gap-[35px]">
          <button
            onClick={() => onViewChange('home')}
            className="transition-opacity duration-200 hover:opacity-80"
            aria-label="Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'home' ? '/icons/home-active.svg' : '/icons/home.svg'}
              alt="Home"
              className="w-10 h-10"
            />
          </button>

          <button
            onClick={() => onViewChange('map')}
            className="transition-opacity duration-200 hover:opacity-80"
            aria-label="Map"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'map' ? '/icons/map-active.svg' : '/icons/map.svg'}
              alt="Map"
              className="w-10 h-10"
            />
          </button>

          <button
            onClick={() => onViewChange('rankings')}
            className="transition-opacity duration-200 hover:opacity-80"
            aria-label="Leaderboards"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'rankings' ? '/icons/leaderboards-active.svg' : '/icons/leaderboards.svg'}
              alt="Leaderboards"
              className="w-[26px] h-[31px]"
            />
          </button>
        </div>
      </div>
    </nav>
  );
}
