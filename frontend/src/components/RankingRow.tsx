"use client";

import { PartyRanking } from "@/lib/types";
import { formatShortDate } from "@/utils/dateHelpers";

interface RankingRowProps {
  rank: number;
  party: PartyRanking;
  isLast?: boolean;
}

export default function RankingRow({ rank, party, isLast }: RankingRowProps) {
  const isTop3 = rank <= 3;

  return (
    <div
      className={`pl-4 pr-3 py-5 ${!isLast ? "border-b border-white/[0.06]" : ""}`}
    >
      {/* Line 1: Rank + Title + Date + Rating */}
      <div className="flex items-center">
        <div className="w-8 flex-shrink-0">
          <span
            className={`text-xl font-bold font-montserrat ${isTop3 ? "text-[#FFD666]" : "text-white/40"}`}
          >
            {rank}
          </span>
        </div>

        <p className="flex-1 min-w-0 text-base font-bold text-white font-montserrat truncate leading-tight">
          {party.title}
        </p>

        {/* Date — fixed width for alignment */}
        <div className="w-20 flex-shrink-0 flex items-center justify-end gap-1">
          {party.date && (
            <>
              <svg
                className="w-4 h-4 text-white/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              <span className="text-sm text-white/40 font-montserrat font-normal">
                {formatShortDate(party.date)}
              </span>
            </>
          )}
        </div>

        {/* Rating — fixed width for alignment */}
        <div className="w-20 flex-shrink-0 flex items-center justify-end gap-1">
          <svg
            className="w-4 h-4 text-white/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
          <span className="text-base font-bold text-white/80 font-montserrat">
            {party.avgRating > 0 ? party.avgRating.toFixed(1) : "—"}
          </span>
          <span className="text-sm text-white/30 font-montserrat font-normal">
            ({party.ratingCount})
          </span>
        </div>
      </div>

      {/* Line 2: Host + Going count */}
      <div className="flex items-center mt-1 pl-8">
        <span className="text-sm text-white/30 font-montserrat font-semibold truncate min-w-0 flex-1">
          by {party.host}
        </span>
        <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-white/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          <span className="text-sm text-white/30 font-montserrat font-medium">
            {party.goingCount}
          </span>
        </div>
      </div>
    </div>
  );
}
