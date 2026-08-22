'use client';

/**
 * HostRow — the host credibility chip on the party page: avatar, name with
 * the verified mark, and (when we have the data) a track-record line like
 * "Fraternity · 12 parties hosted · ↑ 76% avg".
 *
 * The stats come from the same leaderboard math as the Ranks page, but they
 * only exist for hosts an admin has linked via host_codes — most self-serve
 * listings won't have them, so the row quietly degrades to name + checkmark.
 *
 * Deliberately NOT a link: host profile pages don't exist yet. When they
 * ship (the "trust dossier" design), this row becomes the entry point.
 */

import VerifiedMark from '@/components/ui/VerifiedMark';
import LastSemesterChampBadge from '@/components/LastSemesterChampBadge';
import { isLastSemesterChampion } from '@/lib/lastSemesterChampions';

interface HostRowProps {
  name: string;
  isVerified: boolean;
  /** Pre-built cred line; omit to render the name-only row. */
  subtitle?: string;
  avatarUrl?: string | null;
  onShowToast?: (message: string) => void;
}

export default function HostRow({ name, isVerified, subtitle, avatarUrl, onShowToast }: HostRowProps) {
  return (
    <div className="w-full flex items-center gap-2.5 bg-temple-surface rounded-[12px] pl-2.5 pr-3 py-2.5">
      {/* Avatar: host logo when we have one, otherwise their initial on brand purple. */}
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="size-9 shrink-0 rounded-full bg-temple-purple/30 flex items-center justify-center">
          <span className="font-montserrat font-bold text-[14px] text-temple-purple-light">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="min-w-0 flex flex-col gap-[2px]">
        {/* Name, then the verified seal and the #1 crown as a matched 15px
            pair; gap-1 is the only spacing (the marks carry no margins). */}
        <div className="flex items-center gap-1 min-w-0">
          <p className="font-montserrat font-bold text-[14px] text-white truncate">{name}</p>
          {isVerified && <VerifiedMark onShowToast={onShowToast} />}
          {isLastSemesterChampion(name) && <LastSemesterChampBadge interactive hostName={name} />}
        </div>
        {subtitle && (
          <p className="font-montserrat text-[11px] text-temple-muted truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
