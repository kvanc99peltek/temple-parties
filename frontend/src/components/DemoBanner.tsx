interface DemoBannerProps {
  weekendOf: string;
}

function formatSnapshotLabel(weekendOf: string): string {
  // weekendOf is a Friday ISO date (YYYY-MM-DD). Render as "Month Year".
  const [y, m] = weekendOf.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function DemoBanner({ weekendOf }: DemoBannerProps) {
  const label = formatSnapshotLabel(weekendOf);
  return (
    <div className="max-w-xl lg:max-w-3xl mx-auto px-4 lg:px-8 py-2">
      <div className="rounded-lg border border-[#b24bf3] bg-[#1a0a26] px-3 py-2 text-center text-[12px] lg:text-[13px] text-white/85 font-helvetica">
        <span className="font-bold text-[#e0d4ff]">Demo mode</span> — frozen snapshot of {label}.
      </div>
    </div>
  );
}
