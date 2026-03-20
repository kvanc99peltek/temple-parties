'use client';

import useModalBehavior from '@/hooks/useModalBehavior';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function ModalWrapper({ isOpen, onClose, children, className }: ModalWrapperProps) {
  useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
      style={{ zIndex: 10000 }}
    >
      <div className={`w-full max-w-sm bg-zinc-900 rounded-2xl p-8 shadow-2xl shadow-[#08CA66]/30 border border-[#08CA66]/30 animate-scale-in relative ${className || ''}`}>
        {children}
      </div>
    </div>
  );
}
