'use client';

import { useState } from 'react';
import ModalWrapper from './ModalWrapper';

const ADD_PARTY_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScYP6VITctDBeGqpYtgMrStQoShUe0jZpxeuSTeRAcqhWR-9Q/viewform?usp=publish-editor';
const PRIZE_LINK = 'https://www.instagram.com/reel/DVrFxFcgo1D/?igsh=MWNmbTcwbGUxNmFpeQ==';

interface HeaderProps {
  onAddPartyClick: () => void;
  onAccountClick: () => void;
  isAuthenticated: boolean;
  username?: string;
}

export default function Header(props: HeaderProps) {
  void props;
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  return (
    <>
      <header className="bg-black pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-start justify-between">
          <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
            TEMPLE<br />PARTIES
          </h1>
          <div className="mt-2 pr-5 flex items-center gap-3">
            {/* <button
              onClick={() => window.open(ADD_PARTY_FORM_URL, '_blank')}
              className="text-white text-3xl font-light leading-none active:scale-95 transition-transform duration-200"
              aria-label="Add a party"
            >
              +
            </button> */}
            <button
              onClick={() => setShowPrizeModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#FFD666] text-[#C69100] font-Montserrat font-bold text-base active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Win $50"
            >
              Win $50
            </button>
          </div>
        </div>
      </header>

      <ModalWrapper isOpen={showPrizeModal} onClose={() => setShowPrizeModal(false)} className="!p-0 overflow-hidden">
        <div className="p-8 pb-6">
          <h2 className="text-2xl font-montserrat font-semibold text-white mb-4">Win $50</h2>
          <p className="text-gray-300">
            We&apos;re doing a $50 giveaway to celebrate St. Patricks Day. You&apos;ll find the details on our Instagram below.
          </p>
        </div>
        <a
          href={PRIZE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 font-montserrat font-bold text-lg text-center text-[#000000] bg-[#FFD666] hover:bg-[#FFE08A] transition-all duration-200 active:scale-[0.98]"
        >
          Take Me There
        </a>
      </ModalWrapper>
    </>
  );
}
