"use client";

import { useRouter } from "next/navigation";
import { useParty } from "@/contexts/PartyContext";
import { RankedPartyCard } from "./RankedPartyCard";

export function ScoreboardList() {
  const { parties, goingStatuses, setSelectedPartyId } = useParty();
  const router = useRouter();

  const handleCardClick = (partyId: string) => {
    setSelectedPartyId(partyId);
    router.push(`/map?focus=${partyId}`);
  };

  return (
    <div className="flex flex-col gap-3 px-4">
      {parties.map((party, index) => (
        <RankedPartyCard
          key={party.id}
          party={party}
          rank={index + 1}
          isGoing={goingStatuses[party.id] || false}
          onClick={() => handleCardClick(party.id)}
        />
      ))}
    </div>
  );
}
