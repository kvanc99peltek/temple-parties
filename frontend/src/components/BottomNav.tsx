'use client';

interface BottomNavProps {
  activeView: 'home' | 'map';
  onViewChange: (view: 'home' | 'map') => void;
}

// Home icon component
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

// Map icon component
function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

export default function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-md border-t border-zinc-800 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-around h-full max-w-xl mx-auto">
        <button
          onClick={() => onViewChange('home')}
          className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors duration-200 ${
            activeView === 'home'
              ? 'text-[#FA4693]'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          <HomeIcon className="w-6 h-6 mb-1" />
          <span className={`text-xs font-helvetica font-medium`}>Home</span>
        </button>

        <button
          onClick={() => onViewChange('map')}
          className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors duration-200 ${
            activeView === 'map'
              ? 'text-[#FA4693]'
              : 'text-gray-600 hover:text-gray-400'
          }`}
        >
          <MapIcon className="w-6 h-6 mb-1" />
          <span className={`text-xs font-helvetica font-medium`}>Map</span>
        </button>
      </div>
    </nav>
  );
}
