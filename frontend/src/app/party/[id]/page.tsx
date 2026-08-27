import type { Metadata } from 'next';
import { displayDoorTime, getPartyDateLabel } from '@/utils/dateHelpers';
import { fetchPublicParty } from '@/lib/og';
import PartyPageClient from './PartyPageClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const party = await fetchPublicParty(params.id);
  if (!party) {
    return { title: 'Party not found · Temple Parties' };
  }

  const description = `${party.host} · ${getPartyDateLabel(party.date)} · ${displayDoorTime(party.doorsOpen)}`;
  // Poster URL first so iMessage's compact square isn't the site favicon.
  // No-poster parties keep the generated 1200×630 card.
  const images = party.posterImage
    ? [{ url: party.posterImage, alt: party.title }]
    : [{ url: `/party/${party.id}/opengraph-image`, width: 1200, height: 630, alt: party.title }];

  return {
    title: `${party.title} · Temple Parties`,
    description,
    icons: party.posterImage
      ? { icon: '/icon.png', apple: party.posterImage }
      : undefined,
    openGraph: {
      title: party.title,
      description,
      type: 'website',
      siteName: 'Temple Parties',
      url: `/party/${party.id}`,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: party.title,
      description,
      images,
    },
  };
}

export default function PartyPage() {
  return <PartyPageClient />;
}
