'use client';

/**
 * InviteModal — pops right after you tap GOING, riding the excitement of that
 * moment to ask for the one thing that grows the app: share the party with
 * your friends.
 *
 * v2 skin: built from the same pieces as the party page so it reads as part
 * of one system, not a popup from another app —
 *  - a square accent Pill ("✓ ON THE LIST") echoing the GOING state you just
 *    entered, where the old version had a big 🎉 emoji,
 *  - the uppercase Montserrat title scale the hero uses,
 *  - body copy in the FROM-THE-HOST text style,
 *  - a primary bar identical to the sticky action bar's purple slot,
 *  - and a quiet muted "MAYBE LATER" that doesn't compete with the ask.
 * Left-aligned like every v2 surface (the old modal was the only centered one).
 */

import ModalWrapper from './ModalWrapper';
import Pill from './ui/Pill';

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
      <div className="flex flex-col gap-3.5">
        {/* Status tag first, same as the party page's tag row leads its title. */}
        <div>
          <Pill tone="accent" size="sm" shape="square">✓ ON THE LIST</Pill>
        </div>

        <h2 className="text-white text-[24px] leading-7 font-montserrat font-bold uppercase">
          You&apos;re going
        </h2>

        <p className="font-montserrat text-[13px] leading-[19px] text-white/70">
          Invite your friends to join the party.
        </p>

        {/* Primary action — the sticky bar's purple slot, verbatim, so the
            modal's main button feels like the same hand that built the page. */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-[10px] bg-temple-purple text-white font-montserrat font-bold text-[14px] uppercase flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
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
          Share with friends
        </button>

        {/* Dismissal stays quiet: muted text, no border — closing the modal
            shouldn't look like a second option of equal weight. */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-1.5 font-montserrat font-bold text-[10.5px] tracking-[0.63px] uppercase text-temple-muted hover:text-white transition-colors"
        >
          Maybe later
        </button>
      </div>
    </ModalWrapper>
  );
}
