'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getDefaultDay, parseDoorsOpen } from '@/utils/dateHelpers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { openMapsDirections } from '@/utils/shareHelpers';
import { PRIMARY_SPONSOR } from '@/lib/sponsors';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface Party {
  id: string;
  title: string;
  host: string;
  pinLabel: string;
  category: string;
  day: 'friday' | 'saturday';
  date: string;
  doorsOpen: string;
  address: string;
  latitude: number;
  longitude: number;
  goingCount: number;
  isVerified: boolean;
}

interface MapContentProps {
  parties: Party[];
  topPartyIds: { friday: string | null; saturday: string | null };
  userGoingParties: string[];
  onGoingClick: (partyId: string) => void;
  onNavigateClick: (partyId: string) => void;
  fridayDate: string;
  saturdayDate: string;
  sponsorFocus?: { lat: number; lng: number; sponsorId: string } | null;
  onSponsorFocusConsumed?: () => void;
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

// Create minimal avatar-style marker with initials
function createAvatarIcon(
  pinLabel: string,
  host: string,
  count: number,
  maxCount: number,
  isHyped: boolean,
  isGoing: boolean,
  isDimmed: boolean
): L.DivIcon {
  const minSize = 44;
  const maxSize = 64;
  const sizeRatio = Math.min(count / Math.max(maxCount, 1), 1);
  const size = minSize + sizeRatio * (maxSize - minSize);
  // Size range is always 44–64px; scale font to leave breathing room for two lines
  const fontSize = size <= 50 ? 9 : size <= 57 ? 10 : 11;
  const countFontSize = fontSize;

  // Use pin_label if available, otherwise fall back to auto-generated initials
  const label = pinLabel
    ? pinLabel.toUpperCase()
    : host.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  const pulseClass = isHyped ? ' avatar-marker-pulse' : '';
  const goingClass = isGoing ? ' avatar-marker-going' : '';
  const dimStyle = isDimmed ? 'opacity:0.5;' : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="avatar-marker${pulseClass}${goingClass}" style="${dimStyle}width:${size}px;height:${size}px;flex-direction:column;gap:1px;padding:6px;box-sizing:border-box;"><span style="font-size:${fontSize}px;line-height:1;">${label}</span><span style="font-size:${countFontSize}px;font-weight:700;color:white;line-height:1;font-family:'Montserrat',sans-serif;">${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Get short address (before comma)
function getShortAddress(address: string): string {
  return address.split(',')[0];
}

// Sponsored marker icon — gold rounded rectangle
function createSponsorIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="sponsor-marker"><span class="sponsor-marker-label">${label}</span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Pans map to sponsor and opens its popup
function SponsorFocusHandler({
  focus,
  onConsumed,
  markerRef,
}: {
  focus: { lat: number; lng: number } | null;
  onConsumed?: () => void;
  markerRef: React.RefObject<L.Marker | null>;
}) {
  const map = useMap();

  useEffect(() => {
    if (focus && markerRef.current) {
      map.setView([focus.lat, focus.lng], 17, { animate: true });
      const timer = setTimeout(() => {
        markerRef.current?.openPopup();
        onConsumed?.();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [focus, map, markerRef, onConsumed]);

  return null;
}

export default function MapContent({ parties, topPartyIds, userGoingParties, onGoingClick, onNavigateClick, fridayDate, saturdayDate, sponsorFocus, onSponsorFocusConsumed }: MapContentProps) {
  const sponsorMarkerRef = useRef<L.Marker>(null);
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>(getDefaultDay);

  // Smart default: switch to the other day if the default day has no parties
  const fridayCount = useMemo(() => parties.filter(p => p.day === 'friday').length, [parties]);
  const saturdayCount = useMemo(() => parties.filter(p => p.day === 'saturday').length, [parties]);
  const hasAppliedSmartDefault = useRef(false);
  useEffect(() => {
    if (parties.length === 0 || hasAppliedSmartDefault.current) return;
    hasAppliedSmartDefault.current = true;

    const defaultDay = getDefaultDay();
    if (defaultDay === 'friday' && fridayCount === 0 && saturdayCount > 0) {
      setSelectedDay('saturday');
    } else if (defaultDay === 'saturday' && saturdayCount === 0 && fridayCount > 0) {
      setSelectedDay('friday');
    }
  }, [parties, fridayCount, saturdayCount]);

  // Filter parties based on selected day
  const filteredParties = useMemo(() => {
    return parties.filter(party => party.day === selectedDay);
  }, [parties, selectedDay]);

  // Get day numbers for display
  const fridayNum = fridayDate;
  const saturdayNum = saturdayDate;

  return (
    <div className="w-full h-full relative">
      {/* Vertical Day Filter */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
        <button
          onClick={() => setSelectedDay('friday')}
          className={`py-4 px-8 font-black text-lg rounded-2xl transition-all duration-200 font-montserrat ${selectedDay === 'friday'
            ? 'bg-[#08CA66] text-white shadow-lg shadow-[#08CA66]/25'
            : 'bg-black/80 text-white/50 border border-zinc-700 hover:text-gray-300 hover:bg-[#08CA66]/10'
            }`}
        >
          Fri {fridayNum}
        </button>
        <button
          onClick={() => setSelectedDay('saturday')}
          className={`py-4 px-8 font-black text-lg rounded-2xl transition-all duration-200 font-montserrat ${selectedDay === 'saturday'
            ? 'bg-[#08CA66] text-white shadow-lg shadow-[#08CA66]/25'
            : 'bg-black/80 text-white/50 border border-zinc-700 hover:text-gray-300 hover:bg-[#08CA66]/10'
            }`}
        >
          Sat {saturdayNum}
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
        {(() => {
          const maxGoingCount = Math.max(...filteredParties.map(p => p.goingCount), 1);
          const now = new Date();
          const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
          return filteredParties.map(party => {
            const isHyped = party.id === topPartyIds[party.day];
            const userIsGoing = userGoingParties.includes(party.id);
            const doorsOpenTime = parseDoorsOpen(party.doorsOpen, party.date);
            const isDimmed = now.getTime() - doorsOpenTime.getTime() >= FOUR_HOURS_MS;
            const icon = createAvatarIcon(party.pinLabel, party.host, party.goingCount, maxGoingCount, isHyped, userIsGoing, isDimmed);

            return (
              <Marker
                key={party.id}
                position={[party.latitude, party.longitude]}
                icon={icon}
              >
                <Popup className="party-popup-dark">
                  <div className="popup-content">
                    {/* Category Badge + VERIFIED + HYPED */}
                    <div className="popup-badges">
                      <span className="popup-category-badge">{party.category}</span>
                      {party.isVerified && (
                        <span className="popup-verified-badge">VERIFIED</span>
                      )}
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
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      GOING ({party.goingCount})
                    </button>

                    <button
                      onClick={() => {
                        onNavigateClick(party.id);
                        openMapsDirections(party.address);
                      }}
                      className="popup-navigate-btn"
                    >
                      NAVIGATE
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })()}

        {/* Sponsored Pin */}
        <Marker
          ref={sponsorMarkerRef}
          position={[PRIMARY_SPONSOR.latitude, PRIMARY_SPONSOR.longitude]}
          icon={createSponsorIcon(PRIMARY_SPONSOR.pinLabel)}
          zIndexOffset={-500}
          eventHandlers={{
            popupopen: () => {
              track('sponsor_pin_popup_opened', { sponsor: PRIMARY_SPONSOR.id });
              posthog.capture('sponsor_pin_popup_opened', { sponsor: PRIMARY_SPONSOR.id });
            },
          }}
        >
          <Popup className="sponsor-popup-dark">
            <div className="popup-content">
              <div className="popup-badges">
                <span className="popup-sponsor-badge">SPONSORED</span>
              </div>
              <h3 className="popup-title">{PRIMARY_SPONSOR.name}</h3>
              <p className="popup-host" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {PRIMARY_SPONSOR.popupDescription}
              </p>
              {PRIMARY_SPONSOR.tagline && (
                <p style={{ color: '#FFD666', fontSize: '13px', fontWeight: 600, margin: '2px 0 0 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {PRIMARY_SPONSOR.tagline}
                </p>
              )}
              {PRIMARY_SPONSOR.tagline2 && (
                <p style={{ color: 'rgba(255, 214, 102, 0.9)', fontSize: '11px', fontWeight: 500, margin: '2px 0 8px 0', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                  {PRIMARY_SPONSOR.tagline2}
                </p>
              )}
              <div className="popup-details-row">
                <span>{getShortAddress(PRIMARY_SPONSOR.address)}</span>
                {PRIMARY_SPONSOR.hoursInfo && (
                  <div className="popup-time">
                    <span>{PRIMARY_SPONSOR.hoursInfo}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="popup-buttons">
              {PRIMARY_SPONSOR.orderUrl && (
                <a
                  href={PRIMARY_SPONSOR.orderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="popup-going-btn"
                  style={{ textDecoration: 'none', color: 'white' }}
                  onClick={() => {
                    track('sponsor_order_clicked', { sponsor: PRIMARY_SPONSOR.id });
                    posthog.capture('sponsor_order_clicked', { sponsor: PRIMARY_SPONSOR.id });
                  }}
                >
                  ORDER
                </a>
              )}
              <button
                onClick={() => {
                  track('sponsor_navigate_clicked', { sponsor: PRIMARY_SPONSOR.id });
                  posthog.capture('sponsor_navigate_clicked', { sponsor: PRIMARY_SPONSOR.id });
                  openMapsDirections(PRIMARY_SPONSOR.address);
                }}
                className="popup-navigate-btn"
                style={PRIMARY_SPONSOR.orderUrl ? {} : { borderRadius: '0 0 12px 12px', width: '100%' }}
              >
                NAVIGATE
              </button>
            </div>
          </Popup>
        </Marker>

        <SponsorFocusHandler
          focus={sponsorFocus ?? null}
          onConsumed={onSponsorFocusConsumed}
          markerRef={sponsorMarkerRef}
        />
      </MapContainer>
    </div>
  );
}
