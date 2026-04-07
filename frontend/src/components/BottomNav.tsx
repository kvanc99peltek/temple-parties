'use client';

interface BottomNavProps {
  activeView: 'home' | 'map' | 'rankings';
  onViewChange: (view: 'home' | 'map' | 'rankings') => void;
}

export default function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <>
      {/* Desktop top bar — hidden below lg */}
      <nav
        className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-[#0b0b0b]/95 backdrop-blur-md border-b border-white/10 items-center px-8"
        style={{ zIndex: 9999 }}
      >
        <span className="text-[28px] font-normal text-white font-bitcount leading-none">
          Temple<br />Parties
        </span>

        <div className="ml-auto flex items-center gap-8">
          <button
            onClick={() => onViewChange('home')}
            className={`flex items-center gap-2 text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
              activeView === 'home' ? 'text-[#b24bf3]' : 'text-white/60 hover:text-white'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'home' ? '/icons/home-active.svg' : '/icons/home.svg'}
              alt=""
              className="w-6 h-6"
            />
            Home
          </button>

          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-2 text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
              activeView === 'map' ? 'text-[#b24bf3]' : 'text-white/60 hover:text-white'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'map' ? '/icons/map-active.svg' : '/icons/map.svg'}
              alt=""
              className="w-6 h-6"
            />
            Map
          </button>

          <button
            onClick={() => onViewChange('rankings')}
            className={`flex items-center gap-2 text-[15px] font-montserrat font-semibold transition-colors duration-200 ${
              activeView === 'rankings' ? 'text-[#b24bf3]' : 'text-white/60 hover:text-white'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeView === 'rankings' ? '/icons/leaderboards-active.svg' : '/icons/leaderboards.svg'}
              alt=""
              className="w-6 h-6"
            />
            Leaderboards
          </button>
        </div>
      </nav>

      {/* Mobile pill — hidden at lg+ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0" style={{ zIndex: 9999 }}>
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
    </>
  );
}
