'use client';

import { useState } from 'react';
import ModalWrapper from './ModalWrapper';

interface HeaderProps {
  onAddPartyClick: () => void;
  onAccountClick: () => void;
  isAuthenticated: boolean;
  username?: string;
}

export default function Header(props: HeaderProps) {
  void props;
  const [showLostCatModal, setShowLostCatModal] = useState(false);

  return (
    <>
      <header className="bg-black pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-start justify-between">
          <h1 className="text-3xl sm:text-4xl font-medium leading-none tracking-tight text-white font-bitcount">
            TEMPLE<br />PARTIES
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => setShowLostCatModal(true)}
              className="px-4 py-2 rounded-2xl bg-[#FFD666] text-black font-Montserrat font-bold text-sm active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Help find lost cat"
            >
              Help Find<br />Lost Cat
            </button>
          </div>
        </div>
      </header>

      <ModalWrapper isOpen={showLostCatModal} onClose={() => setShowLostCatModal(false)} className="!p-0 overflow-hidden">
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-montserrat font-semibold text-white mb-4">Help Find Benito</h2>
          <p className="text-gray-300">
            A fellow Temple student, Justin, lost his cat Benito. If you find him, please reach out using the info on the poster!
          </p>
        </div>
        <div className="px-8 pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lost-cat-poster.jpg"
            alt="Lost CAT card poster with contact information"
            className="w-full rounded-lg"
          />
        </div>
      </ModalWrapper>
    </>
  );
}
