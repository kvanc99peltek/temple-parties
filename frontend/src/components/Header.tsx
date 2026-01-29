'use client';

interface HeaderProps {
  onAddPartyClick: () => void;
  onAccountClick: () => void;
  isAuthenticated: boolean;
  username?: string;
}

export default function Header({ onAddPartyClick, onAccountClick, isAuthenticated, username }: HeaderProps) {
  return (
    <header className="bg-black pt-6 pb-4">
      <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-start justify-between">
        <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
          TEMPLE<br />PARTIES
        </h1>
        <div className="flex items-center gap-2">
          {/* Add Party Button */}
          <button
            onClick={onAddPartyClick}
            className="text-white hover:text-[#FA4693] hover:bg-[#FA4693]/20 transition-all duration-200 p-2 rounded-full hover:scale-110 active:scale-95"
            aria-label="Add a party"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-7 sm:w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>

          {/* Account Button */}
          <button
            onClick={onAccountClick}
            className={`transition-all duration-200 p-2 rounded-full hover:scale-110 active:scale-95 ${
              isAuthenticated
                ? 'bg-[#FA4693] hover:bg-[#FB6BA8]'
                : 'text-white hover:text-[#FA4693] hover:bg-[#FA4693]/20'
            }`}
            aria-label={isAuthenticated ? 'Account' : 'Sign in'}
          >
            {isAuthenticated && username ? (
              <span className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-white font-semibold text-lg sm:text-xl">
                {username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-9 sm:w-9"
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
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
