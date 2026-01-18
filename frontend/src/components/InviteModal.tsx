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

  const buttonStyle = {
    background: 'linear-gradient(to right, #dc2626, #b91c1c)',
    boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.25)'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 animate-scale-in relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
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
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          You're going!
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-center mb-6 font-light">
          Invite your friends to join the party
        </p>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          style={buttonStyle}
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
          className="w-full mt-3 py-2 text-gray-500 hover:text-gray-300 text-sm font-light transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
