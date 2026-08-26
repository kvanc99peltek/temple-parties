'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { getDefaultDay, parseDoorsOpen } from '@/utils/dateHelpers';
import { pickFeaturedParty } from '@/utils/mapHelpers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { openMapsDirections } from '@/utils/shareHelpers';
import { trackEvent } from '@/utils/analytics';
import { partyPath } from '@/lib/authHelpers';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import NavigateIcon from '@/components/ui/NavigateIcon';
import VoteRow from '@/components/ui/VoteRow';
import { VerifiedSealIcon } from '@/components/ui/VerifiedMark';
import { voteCounts } from '@/utils/ratingHelpers';
import { PRIMARY_SPONSOR } from '@/lib/sponsors';
import type { Party } from '@/lib/types';

interface MapContentProps {
  parties: Party[];
  topPartyIds: { friday: string | null; saturday: string | null };
  userGoingParties: string[];
  onGoingClick: (partyId: string) => void;
  onNavigateClick: (partyId: string) => void;
  onRateClick: (partyId: string, title: string, host: string, ratingActive: boolean, ratingLocked: boolean) => void;
  fridayDate: string;
  saturdayDate: string;
  /** Deep-link target (/map?party=<id>): pan to this party and open its popup. */
  focusPartyId?: string | null;
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
function getShortAddress(address: string | null): string {
  if (!address) return 'Sign in for address';
  return address.split(',')[0];
}

// Sponsored marker icon — light-purple rounded square with the sponsor's initials
function createSponsorIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="sponsor-marker"><span class="sponsor-marker-label">${label}</span></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

/**
 * Opens one party's popup. Deep-links from the party page (/map?party=<id>)
 * zoom in; the featured first-pin (TUP-10) just opens the popup and lets
 * Leaflet auto-pan so the rest of the night stays in view.
 *
 * Callback is stored on a ref so realtime re-renders don't reset the
 * open timer — that used to make deep-link popups miss on a busy map.
 */
function PartyFocusHandler({
  focus,
  markerRefs,
  onConsumed,
}: {
  focus: { id: string; lat: number; lng: number; zoom?: number } | null;
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
  onConsumed: () => void;
}) {
  const map = useMap();
  const onConsumedRef = useRef(onConsumed);
  onConsumedRef.current = onConsumed;

  const focusId = focus?.id;
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;

  useEffect(() => {
    if (!focusId || lat == null || lng == null) return;
    if (zoom != null) {
      map.setView([lat, lng], zoom, { animate: true });
    }

    // Day-tab remounts can land after the first tick — retry until the
    // marker exists instead of consuming a miss and never opening.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 2000;

    const tryOpen = () => {
      if (cancelled) return;
      const marker = markerRefs.current[focusId];
      if (marker) {
        marker.openPopup();
        onConsumedRef.current();
        return;
      }
      if (Date.now() < deadline) {
        timer = setTimeout(tryOpen, 100);
      } else {
        onConsumedRef.current();
      }
    };

    timer = setTimeout(tryOpen, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [focusId, lat, lng, zoom, map, markerRefs]);

  return null;
}

// onRateClick stays in the props contract (pages still pass it) but the popup
// votes went read-only with the v2 redesign — rating happens on the party page.
export default function MapContent({ parties, topPartyIds, userGoingParties, onGoingClick, onNavigateClick, fridayDate, saturdayDate, focusPartyId }: MapContentProps) {
  // const sponsorMarkerRef = useRef<L.Marker>(null);
  const [selectedDay, setSelectedDay] = useState<'friday' | 'saturday'>(getDefaultDay);
  const iconCacheRef = useRef<Map<string, L.DivIcon>>(new Map());
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const [focusConsumed, setFocusConsumed] = useState(false);
  // One auto-open per night so a realtime going-count flip doesn't steal
  // the popup the user is already reading.
  const [featuredOpenedForDay, setFeaturedOpenedForDay] = useState<'friday' | 'saturday' | null>(null);
  const [daySettled, setDaySettled] = useState(false);

  // Deep-link focus (/map?party=<id>): make sure the focused party's DAY tab
  // is the active one, or its marker wouldn't even be on the map.
  const deepLinkParty = !focusConsumed && focusPartyId
    ? parties.find((p) => p.id === focusPartyId) ?? null
    : null;

  useEffect(() => {
    if (deepLinkParty) setSelectedDay(deepLinkParty.day);
  }, [deepLinkParty]);

  // Smart default: switch to the other day if the default day has no parties.
  // Wait to auto-open the featured pin until this has run, or we'd pop Friday
  // then flip the tab to Saturday.
  const fridayCount = useMemo(() => parties.filter(p => p.day === 'friday').length, [parties]);
  const saturdayCount = useMemo(() => parties.filter(p => p.day === 'saturday').length, [parties]);
  const hasAppliedSmartDefault = useRef(false);
  useEffect(() => {
    if (parties.length === 0 || hasAppliedSmartDefault.current) return;
    hasAppliedSmartDefault.current = true;

    const hasDeepLink = Boolean(focusPartyId && parties.some((p) => p.id === focusPartyId));
    if (!hasDeepLink) {
      const defaultDay = getDefaultDay();
      if (defaultDay === 'friday' && fridayCount === 0 && saturdayCount > 0) {
        setSelectedDay('saturday');
      } else if (defaultDay === 'saturday' && saturdayCount === 0 && fridayCount > 0) {
        setSelectedDay('friday');
      }
    }
    setDaySettled(true);
  }, [parties, fridayCount, saturdayCount, focusPartyId]);

  const featuredParty = useMemo(
    () => pickFeaturedParty(parties, topPartyIds, selectedDay),
    [parties, topPartyIds, selectedDay],
  );

  const focus = useMemo(() => {
    if (deepLinkParty) {
      return {
        id: deepLinkParty.id,
        lat: deepLinkParty.latitude,
        lng: deepLinkParty.longitude,
        zoom: 17,
      };
    }
    if (!daySettled || !featuredParty || featuredOpenedForDay === selectedDay) {
      return null;
    }
    return {
      id: featuredParty.id,
      lat: featuredParty.latitude,
      lng: featuredParty.longitude,
    };
  }, [deepLinkParty, daySettled, featuredParty, featuredOpenedForDay, selectedDay]);

  const handleFocusConsumed = useCallback(() => {
    if (deepLinkParty) setFocusConsumed(true);
    setFeaturedOpenedForDay(selectedDay);
  }, [deepLinkParty, selectedDay]);

  // Filter parties based on selected day
  const filteredParties = useMemo(() => {
    return parties.filter(party => party.day === selectedDay);
  }, [parties, selectedDay]);

  // Local const so TS narrowing (sponsor && ...) survives into the marker's
  // event-handler closures — imported bindings don't narrow across closures.
  const sponsor = PRIMARY_SPONSOR;

  // Get day numbers for display
  const fridayNum = fridayDate;
  const saturdayNum = saturdayDate;

  return (
    <div className="w-full h-full relative" style={{ touchAction: 'none' }}>
      {/* Day filter — the same segmented control the home feed uses,
          floating over the top of the map. */}
      <div className="absolute top-4 lg:top-8 inset-x-4 z-[1100] max-w-xl mx-auto">
        <SegmentedTabs
          items={[
            { key: 'friday', label: `FRI ${fridayNum}` },
            { key: 'saturday', label: `SAT ${saturdayNum}` },
          ]}
          activeKey={selectedDay}
          onChange={(key) => {
            setSelectedDay(key as 'friday' | 'saturday');
            trackEvent('day_tab_switched', { day: key, source: 'map' });
          }}
        />
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
          const maxGoingCount = Math.max(...filteredParties.map(p => p.goingCount ?? 0), 1);
          const now = new Date();
          const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
          const iconCache = iconCacheRef.current;
          return filteredParties.map(party => {
            const goingCount = party.goingCount ?? 0;
            const isHyped = party.id === topPartyIds[party.day];
            const userIsGoing = userGoingParties.includes(party.id);
            const doorsOpenTime = parseDoorsOpen(party.doorsOpen, party.date);
            const isDimmed = now.getTime() - doorsOpenTime.getTime() >= FOUR_HOURS_MS;
            const iconKey = `${party.id}|${goingCount}|${maxGoingCount}|${isHyped ? 1 : 0}|${userIsGoing ? 1 : 0}|${isDimmed ? 1 : 0}`;
            let icon = iconCache.get(iconKey);
            if (!icon) {
              icon = createAvatarIcon(party.pinLabel, party.host, goingCount, maxGoingCount, isHyped, userIsGoing, isDimmed);
              iconCache.set(iconKey, icon);
            }

            return (
              <Marker
                key={party.id}
                position={[party.latitude, party.longitude]}
                icon={icon}
                zIndexOffset={isHyped ? 1000 : 0}
                ref={(el) => {
                  markerRefs.current[party.id] = el;
                }}
                eventHandlers={{
                  click: () => {
                    trackEvent('map_marker_clicked', { partyId: party.id, partyTitle: party.title });
                  },
                }}
              >
                {/* autoPanPadding keeps the popup out from under the day tabs
                    and the iOS tab bar so the tap-through actually lands. */}
                <Popup className="party-popup-dark" closeButton={false} autoPanPadding={[28, 100]}>
                  {/* Whole body is the party-page tap target (same contract as
                      feed cards). Native <a> via Link so iOS Safari follows
                      href even if React's click interceptor misses. GOING /
                      navigate sit outside the link — never nest buttons. */}
                  <Link
                    href={partyPath(party.id)}
                    prefetch={false}
                    className="popup-party-link"
                    aria-label={`View ${party.title}`}
                    onClick={(e) => {
                      // Leaflet listens on the popup wrapper; stop so iOS
                      // Safari actually follows the href on the first tap.
                      e.stopPropagation();
                      trackEvent('map_popup_tapped', { partyId: party.id, partyTitle: party.title });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="popup-content">
                      {/* One chip only — the popup is tight on space, so the
                          headliner badge wins; everyone else shows their type. */}
                      <div className="popup-badges">
                        {isHyped ? (
                          <span className="popup-hyped-badge">HEADLINER</span>
                        ) : (
                          <span className="popup-category-badge">{party.category}</span>
                        )}
                        <span className="popup-chevron" aria-hidden>
                          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </div>

                      <h3 className="popup-title">{party.title}</h3>

                      <p className="popup-host">
                        <span className="popup-host-by">by&nbsp;</span>
                        <span className="popup-host-name">{party.host}</span>
                        {party.isVerified && (
                          <VerifiedSealIcon size={14} className="popup-verified-icon" />
                        )}
                      </p>

                      {/* Card-style data line: door time + read-only votes (the
                          pin already IS the location, so no address row). */}
                      <div className="flex items-center gap-3">
                        <span className="font-montserrat text-[14px] text-white/70 whitespace-nowrap">{party.doorsOpen}</span>
                        <VoteRow
                          likeCount={voteCounts(party.likePercentage, party.ratingCount)?.likeCount ?? null}
                          dislikeCount={voteCounts(party.likePercentage, party.ratingCount)?.dislikeCount ?? null}
                          userRating={null}
                          state={party.ratingLocked ? 'locked' : party.ratingOpen ? 'open' : 'inactive'}
                          size="md"
                        />
                      </div>
                    </div>
                  </Link>

                  <div className="popup-buttons">
                    <button
                      type="button"
                      onClick={() => onGoingClick(party.id)}
                      className={`popup-going-btn ${userIsGoing ? 'going' : ''}`}
                    >
                      {userIsGoing && (
                        <svg className="popup-check-icon" fill="white" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {/* Soft-gate rule: no fake zeros — anon sees no count. */}
                      {party.goingCount === null ? 'GOING' : `GOING (${goingCount})`}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigateClick(party.id);
                        if (party.address) openMapsDirections(party.address);
                      }}
                      className="popup-navigate-btn"
                      disabled={!party.address}
                      aria-label="Navigate"
                    >
                      <NavigateIcon className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })()}

        {/* Sponsored pin + popup — driven by lib/sponsors.ts (empty array =
            nothing renders). Same popup design language as the party pins:
            one square chip, surface-2 card, fused bottom buttons. */}
        {sponsor && (
          <Marker
            position={[sponsor.latitude, sponsor.longitude]}
            icon={createSponsorIcon(sponsor.pinLabel)}
            zIndexOffset={-500}
            eventHandlers={{
              popupopen: () => {
                trackEvent('sponsor_pin_popup_opened', { sponsor: sponsor.id });
              },
            }}
          >
            <Popup className="sponsor-popup-dark" closeButton={false}>
              <div className="popup-content">
                <div className="popup-badges">
                  <span className="popup-sponsor-badge">SPONSORED</span>
                </div>
                <h3 className="popup-title">{sponsor.name}</h3>
                <p className="popup-host">{sponsor.popupDescription}</p>
                {sponsor.tagline && (
                  <p className="font-montserrat font-semibold text-[12px] text-temple-purple-light !mt-0.5 !mb-0">
                    {sponsor.tagline}
                  </p>
                )}
                {sponsor.tagline2 && (
                  <p className="font-montserrat text-[11px] text-temple-purple-light/75 !mt-0.5 !mb-0">
                    {sponsor.tagline2}
                  </p>
                )}
                {/* Card-style data lines: plain muted text, no icon clutter. */}
                <div className="font-montserrat text-[13px] text-white/70 !mt-2 !mb-0">
                  {getShortAddress(sponsor.address)}
                  {sponsor.hoursInfo && ` · ${sponsor.hoursInfo}`}
                </div>
              </div>
              <div className="popup-buttons">
                {sponsor.orderUrl && (
                  <a
                    href={sponsor.orderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="popup-going-btn"
                    style={{ textDecoration: 'none', color: 'white' }}
                    onClick={() => {
                      trackEvent('sponsor_order_clicked', { sponsor: sponsor.id });
                    }}
                  >
                    ORDER
                  </a>
                )}
                <button
                  type="button"
                  aria-label="Navigate"
                  onClick={() => {
                    trackEvent('sponsor_navigate_clicked', { sponsor: sponsor.id });
                    openMapsDirections(sponsor.address);
                  }}
                  className="popup-navigate-btn"
                  style={sponsor.orderUrl ? {} : { borderRadius: '0 0 12px 12px', width: '100%' }}
                >
                  <NavigateIcon className="w-[18px] h-[18px]" />
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        <PartyFocusHandler
          focus={focus}
          markerRefs={markerRefs}
          onConsumed={handleFocusConsumed}
        />
      </MapContainer>
    </div>
  );
}
