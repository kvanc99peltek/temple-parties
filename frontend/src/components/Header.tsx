'use client';

interface HeaderProps {
  onShare: () => void;
  hasGoingParties: boolean;
}

export default function Header({ onShare }: HeaderProps) {
  return (
    <header className="bg-black pt-6 pb-4">
      <div className="max-w-2xl mx-auto px-4 flex items-start justify-between">
        <h1 className="text-4xl font-bold text-cherry-600 leading-none tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
          TEMPLE<br />PARTIES
        </h1>
        <button
          onClick={onShare}
          className="text-cherry-600 hover:text-cherry-500 transition-colors p-2"
          aria-label="Profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
