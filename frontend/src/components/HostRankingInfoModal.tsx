"use client";

import ModalWrapper from "./ModalWrapper";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HostRankingInfoModal({ isOpen, onClose }: Props) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl lg:text-2xl font-bold text-white font-montserrat mb-4">
        How we rank the host
      </h2>

      <p className="text-sm lg:text-base text-white/70 font-montserrat mb-3">
        It&apos;s not just the ratings. We look at:
      </p>

      <ul className="text-sm lg:text-base text-white/70 font-montserrat space-y-2 mb-4">
        <li>
          <span className="text-white font-semibold">Rating %</span> — how hyped
          people felt.
        </li>
        <li>
          <span className="text-white font-semibold">Turnout</span> — how many
          people showed up.
        </li>
        <li>
          <span className="text-white font-semibold">Track record</span> — need
          2+ parties and 15+ ratings to count.
        </li>
      </ul>

      <p className="text-sm lg:text-base text-white/70 font-montserrat mb-3">
        Higher rating % usually wins, but turnout and track record can shift
        things when ratings are closed.
      </p>

      <p className="text-sm lg:text-base text-white/70 font-montserrat mb-6">
    
      </p>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-3 lg:py-3.5 bg-[#b24bf3] hover:bg-[#a03de0] transition-colors rounded-xl text-white font-montserrat font-bold text-base lg:text-lg"
      >
        Got it
      </button>
    </ModalWrapper>
  );
}
