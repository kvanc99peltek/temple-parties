'use client';

import { useEffect } from 'react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
}

export default function InviteModal({ isOpen, onClose, onShare }: InviteModalProps) {
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

  const handleShare = () => {
    onShare();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      style={{ zIndex: 10000 }}
    >
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-purple-500/30 border border-purple-500/30 animate-scale-in relative">
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Party emoji */}
        <div className="text-center mb-4">
          <span className="text-5xl">🎉</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-white text-center mb-2">
          You&apos;re going!
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-center mb-6">
          Invite your friends to join the party
        </p>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-3.5 px-6 rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share with Friends
        </button>

        {/* Skip button */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 text-gray-600 hover:text-gray-400 hover:bg-white/5 text-sm font-medium rounded-xl transition-all"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
