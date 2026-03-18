interface SponsorBannerProps {
  text: string;
  sponsorName: string;
  onClick: () => void;
}

export default function SponsorBanner({ text, sponsorName, onClick }: SponsorBannerProps) {
  // Split the text around the sponsor name to style it differently
  const parts = text.split(sponsorName);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-2">
      <button
        onClick={onClick}
        className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
      >
        {parts[0]}
        <span className="text-[#FFD666] font-semibold">{sponsorName}</span>
        {parts[1]}
        <span className="ml-1 text-white/25">›</span>
      </button>
    </div>
  );
}
