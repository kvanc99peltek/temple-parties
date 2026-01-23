'use client';

import { useEffect } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  partyCount: number;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, username, partyCount, onLogout }: ProfileModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      style={{ zIndex: 10000 }}
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-[#FA4693]/30 border border-[#FA4693]/30 animate-scale-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

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
      </div>
    </div>
  );
}
