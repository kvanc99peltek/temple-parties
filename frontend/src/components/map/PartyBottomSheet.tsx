"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useParty } from "@/contexts/PartyContext";
import { GoingButton } from "@/components/shared/GoingButton";

export function PartyBottomSheet() {
  const { selectedPartyId, setSelectedPartyId, getPartyById, goingStatuses, toggleGoing } =
    useParty();

  const party = selectedPartyId ? getPartyById(selectedPartyId) : null;
  const isGoing = selectedPartyId ? goingStatuses[selectedPartyId] || false : false;

  if (!party) return null;

  return (
    <Drawer
      open={!!selectedPartyId}
      onOpenChange={(open: boolean) => {
        if (!open) setSelectedPartyId(null);
      }}
    >
      <DrawerContent className="bg-card border-t border-border">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="text-left">
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                  {party.title}
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    LIVE
                  </span>
                </DrawerTitle>
                <p className="text-muted-foreground mt-1">{party.host}</p>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 space-y-6">
            {/* Address */}
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-foreground">{party.address}</span>
            </div>

            {/* Going Count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-neon-cyan">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="font-bold text-lg">{party.goingCount}</span>
              </div>
              <span className="text-muted-foreground text-sm">PARTYING NOW</span>
            </div>

            {/* Avatars (decorative) */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border-2 border-card flex items-center justify-center text-xs"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Alex, Olivia, and 12 friends are here
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <GoingButton
                isGoing={isGoing}
                onToggle={() => toggleGoing(party.id)}
                size="lg"
                className="flex-1"
              />
              <button
                className="p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: party.title,
                      text: `Check out ${party.title} at ${party.host}!`,
                      url: window.location.href,
                    });
                  }
                }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
