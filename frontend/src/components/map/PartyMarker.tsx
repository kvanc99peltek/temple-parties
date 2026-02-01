"use client";

import { Marker } from "react-leaflet";
import L from "leaflet";
import { Party } from "@/lib/types";

interface PartyMarkerProps {
  party: Party;
  rank: number;
  maxGoingCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function PartyMarker({
  party,
  rank,
  maxGoingCount,
  isSelected,
  onClick,
}: PartyMarkerProps) {
  // Calculate marker size based on popularity (28px to 44px)
  const minSize = 28;
  const maxSize = 44;
  const sizeRatio = Math.min(party.goingCount / Math.max(maxGoingCount, 1), 1);
  const size = minSize + sizeRatio * (maxSize - minSize);

  // Calculate font size based on marker size
  const fontSize = size <= 32 ? 10 : size <= 38 ? 12 : 14;

  // Extract 2-3 letter initials from host name
  const initials = party.host
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  // Rank 1 gets pulse animation
  const isPulsing = rank === 1;

  const markerHtml = `
    <div class="avatar-marker ${isSelected ? "avatar-marker-selected" : ""} ${isPulsing ? "avatar-marker-pulse" : ""}"
      style="
        width: ${size}px;
        height: ${size}px;
        font-size: ${fontSize}px;
      "
    >
      ${initials}
    </div>
  `;

  const customIcon = L.divIcon({
    html: markerHtml,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  return (
    <Marker
      position={[party.latitude, party.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: onClick,
      }}
    />
  );
}
