"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useParty } from "@/contexts/PartyContext";
import { PartyMarker } from "./PartyMarker";
import "leaflet/dist/leaflet.css";

// Temple University center coordinates
const TEMPLE_CENTER: [number, number] = [39.9812, -75.1545];
const DEFAULT_ZOOM = 15;

// Component to handle map centering on selected party
function MapController() {
  const { selectedPartyId, getPartyById } = useParty();
  const map = useMap();

  useEffect(() => {
    if (selectedPartyId) {
      const party = getPartyById(selectedPartyId);
      if (party) {
        map.flyTo([party.latitude, party.longitude], 16, {
          duration: 0.5,
        });
      }
    }
  }, [selectedPartyId, getPartyById, map]);

  return null;
}

export function PartyMap() {
  const { parties, selectedPartyId, setSelectedPartyId } = useParty();
  const maxGoingCount = Math.max(...parties.map((p) => p.goingCount), 1);

  return (
    <MapContainer
      center={TEMPLE_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      {/* Dark map tiles from CartoDB */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {/* Map controller for centering */}
      <MapController />

      {/* Party markers */}
      {parties.map((party, index) => (
        <PartyMarker
          key={party.id}
          party={party}
          rank={index + 1}
          maxGoingCount={maxGoingCount}
          isSelected={selectedPartyId === party.id}
          onClick={() => setSelectedPartyId(party.id)}
        />
      ))}
    </MapContainer>
  );
}
