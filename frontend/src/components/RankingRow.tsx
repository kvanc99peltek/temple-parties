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
        <div className="w-24 flex-shrink-0 flex items-center justify-end gap-1">
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
              d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z"
            />
          </svg>
          <span className="text-base font-bold text-white/80 font-montserrat">
            {party.ratingCount >= 5 ? `${Math.round(party.likePercentage)}%` : "—"}
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
