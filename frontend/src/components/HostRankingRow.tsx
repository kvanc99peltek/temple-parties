"use client";

import { memo } from "react";
import { HostRanking } from "@/lib/types";

interface HostRankingRowProps {
  rank: number;
  host: HostRanking;
  isLast?: boolean;
  isBelowThreshold?: boolean;
}

function HostRankingRow({ rank, host, isLast, isBelowThreshold }: HostRankingRowProps) {
  const isTop3 = rank <= 3;

  return (
    <div
      className={`pl-4 pr-3 pt-3 pb-3 lg:pl-6 lg:pr-5 lg:pt-4 lg:pb-4 ${!isLast ? "border-b border-white/[0.06]" : ""} ${isBelowThreshold ? "opacity-60" : ""}`}
    >
      {/* Line 1: Rank + Display name + Avg rating */}
      <div className="flex items-center">
        <div className="w-8 lg:w-10 flex-shrink-0">
          <span
            className={`text-xl lg:text-2xl font-bold font-montserrat ${isTop3 ? "text-[#e0d4ff]" : "text-white/40"}`}
          >
            {rank}
          </span>
        </div>

        <p className="flex-1 min-w-0 text-base lg:text-lg font-bold text-white font-montserrat truncate leading-tight">
          {host.displayName}
        </p>

        {/* Avg rating — fixed width for alignment */}
        <div className="w-24 lg:w-28 flex-shrink-0 flex items-center justify-end gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/thumbs-up.svg" alt="" className="w-4 h-4 lg:w-5 lg:h-5 opacity-50" />
          <span className="text-base lg:text-lg font-bold text-white font-montserrat">
            {isBelowThreshold ? "—" : `${Math.round(host.avgLikePercentage)}%`}
          </span>
          <span className="text-sm lg:text-base text-white/30 font-montserrat font-normal">
            ({host.totalRatingCount})
          </span>
        </div>
      </div>

      {/* Line 2: Party count + Total going count */}
      <div className="flex items-center mt-1 pl-8">
        <span className="text-sm lg:text-base text-white/30 font-montserrat font-semibold truncate min-w-0 flex-1">
          {host.partiesHosted} {host.partiesHosted === 1 ? "party" : "parties"} hosted
        </span>
        <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white/30"
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
          <span className="text-sm lg:text-base text-white/30 font-montserrat font-medium">
            {host.totalGoingCount}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(HostRankingRow);
