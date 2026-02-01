"use client";

import { Party } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RankedPartyCardProps {
  party: Party;
  rank: number;
  isGoing: boolean;
  onClick: () => void;
}

export function RankedPartyCard({
  party,
  rank,
  isGoing,
  onClick,
}: RankedPartyCardProps) {
  const getRankStyles = () => {
    switch (rank) {
      case 1:
        return {
          badge: "bg-neon-cyan text-black",
          border: "border-neon-cyan",
          glow: "shadow-neon-cyan",
          count: "text-neon-cyan",
        };
      case 2:
        return {
          badge: "bg-neon-pink text-black",
          border: "border-neon-pink",
          glow: "shadow-neon-pink",
          count: "text-neon-pink",
        };
      case 3:
        return {
          badge: "bg-neon-purple text-white",
          border: "border-neon-purple",
          glow: "shadow-neon-purple",
          count: "text-neon-purple",
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground",
          border: "border-border",
          glow: "",
          count: "text-muted-foreground",
        };
    }
  };

  const styles = getRankStyles();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl bg-card border-2 transition-all",
        styles.border,
        rank <= 3 && styles.glow,
        "hover:scale-[1.02] active:scale-[0.98]"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
          styles.badge
        )}
      >
        {rank}
      </div>

      {/* Party Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg truncate">{party.title}</h3>
          {isGoing && (
            <span className="flex-shrink-0 text-xs bg-neon-cyan/20 text-neon-cyan px-2 py-0.5 rounded-full">
              GOING
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{party.host}</p>
      </div>

      {/* Going Count */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <svg
          className={cn("w-5 h-5", styles.count)}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
        <span className={cn("font-bold text-lg", styles.count)}>
          {party.goingCount}
        </span>
      </div>
    </button>
  );
}
