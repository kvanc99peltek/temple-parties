'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getDefaultDay } from '@/utils/dateHelpers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { openMapsDirections } from '@/utils/shareHelpers';

interface Party {
  id: string;
  title: string;
  host: string;
  category: string;
  day: 'friday' | 'saturday';
  doorsOpen: string;
  address: string;
  latitude: number;
  longitude: number;
  goingCount: number;
}

interface MapContentProps {
  parties: Party[];
  topPartyIds: { friday: string | null; saturday: string | null };
  userGoingParties: string[];
  onGoingClick: (partyId: string) => void;
  fridayDate: string;
  saturdayDate: string;
}

// Temple University campus center
const TEMPLE_CENTER: [number, number] = [39.9812, -75.1550];

// Temple University label component
function TempleLabel() {
  const map = useMap();

  useEffect(() => {
    const labelIcon = L.divIcon({
      className: 'temple-label-icon',
      html: '<div class="campus-label">Temple University</div>',
      iconSize: [140, 30],
      iconAnchor: [70, 15],
    });

    const marker = L.marker([39.9795, -75.1570], {
      icon: labelIcon,
      interactive: false,
      zIndexOffset: -1000,
    }).addTo(map);

    return () => {
      map.removeLayer(marker);
    };
  }, [map]);

  return null;
}

// Create custom marker icon with host name and going count
function createMarkerIcon(host: string, count: number, isHyped: boolean, userIsGoing: boolean): L.DivIcon {
  const bubbleClass = isHyped ? 'marker-bubble hyped' : userIsGoing ? 'marker-bubble going' : 'marker-bubble';
  const pinClass = isHyped ? 'marker-pin-v2 hyped' : userIsGoing ? 'marker-pin-v2 going' : 'marker-pin-v2';

  return L.divIcon({
    className: 'custom-party-marker',
    html: `
      <div class="${bubbleClass}">
        <div class="host-name">${host}</div>
        <div class="going-count-text">${count} going</div>
      </div>
      <div class="${pinClass}"></div>
    `,
    iconSize: [140, 75],
    iconAnchor: [70, 75],
    popupAnchor: [0, -75],
  });
}

// Get short address (before comma)
function getShortAddress(address: string): string {
  return address.split(',')[0];
}


export default function MapContent({ parties, topPartyIds, userGoingParties, onGoingClick, fridayDate, saturdayDate }: MapContentProps) {
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>(getDefaultDay);

  // Filter parties based on selected day
  const filteredParties = useMemo(() => {
    return parties.filter(party => party.day === selectedDay);
  }, [parties, selectedDay]);

  // Extract day numbers from date strings
  const fridayNum = fridayDate.split('/')[1];
  const saturdayNum = saturdayDate.split('/')[1];

  if (parties.length === 0) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-2 text-gray-400">No parties this weekend</p>
          <p className="text-sm text-[#FA4693]">Check back on Thursday!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Vertical Day Filter */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
        <button
          onClick={() => setSelectedDay('friday')}
          className={`py-4 px-8 font-black text-lg rounded-2xl transition-all duration-200 font-montserrat-alt ${
            selectedDay === 'friday'
              ? 'bg-[#FA4693] text-white shadow-lg shadow-[#FA4693]/25'
              : 'bg-black/80 text-white border border-zinc-700 hover:text-gray-300 hover:bg-[#FA4693]/10'
          }`}
        >
          Fri {fridayNum}
        </button>
        <button
          onClick={() => setSelectedDay('saturday')}
          className={`py-4 px-8 font-black text-lg rounded-2xl transition-all duration-200 font-montserrat-alt ${
            selectedDay === 'saturday'
              ? 'bg-[#FA4693] text-white shadow-lg shadow-[#FA4693]/25'
              : 'bg-black/80 text-white border border-zinc-700 hover:text-gray-300 hover:bg-[#FA4693]/10'
          }`}
        >
          SAT {saturdayNum}
        </button>
      </div>

      <MapContainer
        center={TEMPLE_CENTER}
        zoom={15}
        zoomControl={false}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ background: '#1a1a1a' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <TempleLabel />
        {filteredParties.map(party => {
          const isHyped = party.id === topPartyIds[party.day];
          const userIsGoing = userGoingParties.includes(party.id);
          const icon = createMarkerIcon(party.host, party.goingCount, isHyped, userIsGoing);

          return (
            <Marker
              key={party.id}
              position={[party.latitude, party.longitude]}
              icon={icon}
            >
              <Popup className="party-popup-dark">
                <div className="popup-content">
                  {/* Category Badge + HYPED */}
                  <div className="popup-badges">
                    <span className="popup-category-badge">{party.category}</span>
                    {isHyped && (
                      <span className="popup-hyped-badge">HYPED</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="popup-title">{party.title}</h3>

                  {/* Host */}
                  <p className="popup-host">
                    <span className="popup-host-by">by </span>
                    <span className="popup-host-name">{party.host}</span>
                  </p>

                  {/* Address + Time Row */}
                  <div className="popup-details-row">
                    <span>{getShortAddress(party.address)}</span>
                    <div className="popup-time">
                      <svg className="popup-time-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{party.doorsOpen}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - flush with popup edges */}
                <div className="popup-buttons">
                  <button
                    onClick={() => onGoingClick(party.id)}
                    className={`popup-going-btn ${userIsGoing ? 'going' : ''}`}
                  >
                    {userIsGoing && (
                      <svg className="popup-check-icon" fill="white" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                    GOING ({party.goingCount})
                  </button>

                  <button
                    onClick={() => openMapsDirections(party.address)}
                    className="popup-navigate-btn"
                  >
                    NAVIGATE
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
