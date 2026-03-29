'use client';

import ModalWrapper from './ModalWrapper';

interface SponsorReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsorName: string;
  onNavigate: () => void;
}

export default function SponsorReminderModal({
  isOpen,
  onClose,
  sponsorName,
  onNavigate,
}: SponsorReminderModalProps) {
  const handleNavigate = () => {
    onNavigate();
    onClose();
  };

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      className="!border-[#FFD666]/30 !shadow-[#FFD666]/30 !p-0 overflow-hidden !max-w-[300px]"
    >
      <div className="text-center px-8 pt-8 pb-2">
        <h3 className="text-xl font-bold text-white font-montserrat">
          Are you starving?<br />Grab food at<br /><span className="text-[#FFD666]">{sponsorName}</span>
        </h3>
      </div>

      <p className="text-white/40 text-xs font-helvetica text-center pb-4">
        ~ 5 minute walk
      </p>

      <button
        onClick={handleNavigate}
        className="w-full h-[49px] rounded-bl-2xl rounded-br-2xl font-bold text-lg uppercase bg-[#FFD666] text-black hover:opacity-90 active:scale-[0.98] transition-all duration-150 font-montserrat"
      >
        NAVIGATE
      </button>
    </ModalWrapper>
  );
}
