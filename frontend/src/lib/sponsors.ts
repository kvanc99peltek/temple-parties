export interface SponsorConfig {
  id: string;
  name: string;
  bannerText: string;
  address: string;
  latitude: number;
  longitude: number;
  pinLabel: string;
  popupDescription: string;
  promoCode?: string;
  promoText?: string;
  hoursInfo?: string;
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
    popupDescription: "Nashville hot chicken right near campus.",
    promoCode: 'TUPARTIES',
    promoText: '10% off',
    hoursInfo: 'Open till 2 am',
  },
];

export const PRIMARY_SPONSOR = SPONSORS[0];
