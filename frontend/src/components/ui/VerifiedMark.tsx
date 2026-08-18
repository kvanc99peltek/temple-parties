/**
 * VerifiedMark — the little verified checkmark that sits after a host name.
 *
 * Two stacked SVGs (a star burst + a check) because that's how the asset was
 * cut for v1 — keeping the exact same art keeps verified hosts recognizable.
 * On phones (no hover) a tap explains the badge via toast; on desktop the
 * title tooltip does that job, so the cursor stays default.
 */

export default function VerifiedMark({
  onShowToast,
}: {
  onShowToast?: (message: string) => void;
}) {
  return (
    <span
      title="Verified host"
      onClick={() => onShowToast?.('Verified host')}
      className="relative shrink-0 ml-0.5 w-[14px] h-[14px] inline-block cursor-pointer lg:cursor-default"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/verified-star.svg" alt="" className="absolute left-0 top-0 w-[14px] h-[14px]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/verified-check.svg" alt="Verified" className="absolute left-[4.5px] top-[4px] w-[5px] h-[4px]" />
    </span>
  );
}
