interface SponsorBannerProps {
  text: string;
  sponsorName: string;
  onClick: () => void;
}

export default function SponsorBanner({ text, sponsorName, onClick }: SponsorBannerProps) {
  const parts = text.split(sponsorName);

  return (
    <div className="max-w-xl mx-auto px-4 py-1">
      <button
        onClick={onClick}
        className="w-full text-center text-[12px] text-white/75 hover:text-white/90 transition-colors cursor-pointer font-helvetica"
      >
        {parts[0]}
        <span className="text-[#e0d4ff] font-bold">{sponsorName}</span>
        {parts[1]}
      </button>
    </div>
  );
}
