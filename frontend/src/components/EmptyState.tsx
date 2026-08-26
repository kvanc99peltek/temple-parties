'use client';

import Link from 'next/link';
import type { PartyDay } from '@/lib/types';
import { getDayName } from '@/utils/dateHelpers';

interface EmptyStateProps {
  selectedDay?: PartyDay;
  message?: string;
  /**
   * Leaderboards CTA href. Defaults to `/leaderboards`.
   * Pass `null` to hide (e.g. already on leaderboards).
   */
  leaderboardsHref?: string | null;
}

export default function EmptyState({
  selectedDay,
  message,
  leaderboardsHref,
}: EmptyStateProps) {
  const displayMessage = message
    ?? (selectedDay ? `No parties yet for ${getDayName(selectedDay)}` : 'No parties yet');
  const href = leaderboardsHref === undefined ? '/leaderboards' : leaderboardsHref;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-12">
      <h2 className="text-xl lg:text-2xl font-semibold text-gray-400 mb-2 text-center font-montserrat">
        {displayMessage}
      </h2>
      <p className="text-gray-500 text-sm lg:text-base text-center font-montserrat">
        Check back later for updates
      </p>
      {href && (
        <Link
          href={href}
          className="text-[#b24bf3] text-sm lg:text-base text-center font-montserrat mt-2 underline"
        >
          Check this semester&apos;s leaderboards
        </Link>
      )}
    </div>
  );
}
