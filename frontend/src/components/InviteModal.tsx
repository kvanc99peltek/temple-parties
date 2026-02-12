'use client';

import ModalWrapper from './ModalWrapper';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
}

export default function InviteModal({ isOpen, onClose, onShare }: InviteModalProps) {
  const handleShare = () => {
    onShare();
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
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
        className="w-full py-3.5 px-6 rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 bg-[#FA4693] hover:bg-[#FB6BA8] shadow-lg shadow-[#FA4693]/30 hover:shadow-[#FA4693]/40"
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
    </ModalWrapper>
  );
}
