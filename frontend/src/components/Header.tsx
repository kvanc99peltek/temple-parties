'use client';

interface HeaderProps {
  onAddPartyClick: () => void;
  onAccountClick: () => void;
  isAuthenticated: boolean;
  username?: string;
}

export default function Header(props: HeaderProps) {
  void props;
  return (
    <header className="bg-black pt-6 pb-4">
      <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-start justify-between">
        <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
          TEMPLE<br />PARTIES
        </h1>
        {/* Intentionally hidden: add-party (+) and profile/auth buttons */}
      </div>
    </header>
  );
}
