'use client';

import ModalWrapper from './ModalWrapper';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  partyCount: number;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, username, partyCount, onLogout }: ProfileModalProps) {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-[#FA4693] flex items-center justify-center">
          <span className="text-3xl font-bold text-white">
            {username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Username */}
      <h2 className="text-2xl font-semibold text-white text-center mb-6">
        {username}
      </h2>

      {/* Stats */}
      <div className="border-t border-zinc-800 py-4 mb-4">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <span className="text-xl">🎉</span>
          <span>{partyCount} {partyCount === 1 ? 'party' : 'parties'} created</span>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 px-6 rounded-xl font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200 active:scale-95"
      >
        Sign Out
      </button>
    </ModalWrapper>
  );
}
