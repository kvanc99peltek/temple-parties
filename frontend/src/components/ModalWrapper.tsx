'use client';

/**
 * ModalWrapper — the one shared shell every modal sits in (invite, rating,
 * ranking info…). It owns the chrome so individual modals only bring content:
 * the dimmed backdrop, the centered panel, escape/backdrop-click to close.
 *
 * v2 skin (DESIGN.md): the panel is a flat `temple-surface` module with the
 * same hairline border as cards — no purple border, and NO glow shadow. The
 * old purple halo broke the "one glow" rule (only the HEADLINER badge glows),
 * so elevation now comes from a plain black shadow instead. The backdrop is
 * a solid dim, not backdrop-blur — live blur over a scrollable page is the
 * exact thing rule 3 bans.
 */

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

  // Only close when the click landed on the backdrop itself — a click inside
  // the panel bubbles up here too, and currentTarget tells them apart.
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/85 animate-fade-in"
      onClick={handleBackdropClick}
      data-testid="modal-backdrop"
      style={{ zIndex: 10000 }}
    >
      <div className={`w-full max-w-sm lg:max-w-md bg-temple-surface border border-white/10 rounded-[16px] p-6 sm:p-7 shadow-2xl animate-scale-in relative ${className || ''}`}>
        {children}
      </div>
    </div>
  );
}
