/**
 * Sponsor config — the single source of truth for sponsored content.
 *
 * One entry here lights up every sponsor surface at once: the SPONSORED
 * slot on the home feed and the gold pin + popup on the map. Empty the
 * SPONSORS array to turn it all off (no deal = no ads, nothing renders).
 *
 * Originally built for the Hangry Joe's deal, pulled when it fell through,
 * revived 2026-08-17 with the v2 design system.
 */

export interface SponsorConfig {
  id: string;
  name: string;
  bannerText: string;
  address: string;
  latitude: number;
  longitude: number;
  pinLabel: string;
  popupDescription: string;
  tagline?: string;
  tagline2?: string;
  hoursInfo?: string;
  orderUrl?: string;
}

export const SPONSORS: SponsorConfig[] = [
  {
    id: 'hangry-joes',
    name: "Hangry Joe's",
    bannerText: "Hungry? Check out Hangry Joe's",
    address: '1422 Cecil B. Moore Ave, Philadelphia, PA 19121',
    latitude: 39.97866057729966,
    longitude: -75.15908057988015,
    pinLabel: 'HJ',
    popupDescription: 'Halal Hot Chicken',
    tagline: 'Beer Available (ID required)',
    tagline2: 'Everyone In The Group Must Be 21+',
    hoursInfo: 'Open till 2 am',
    orderUrl: 'https://order.incentivio.com/c/hangryjoes/locations/philadelphiacecilbmooreave',
  },
];

/** The one sponsor surfaces render today; undefined when SPONSORS is empty. */
export const PRIMARY_SPONSOR: SponsorConfig | undefined = SPONSORS[0];
