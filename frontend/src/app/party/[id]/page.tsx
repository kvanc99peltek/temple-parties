import type { Metadata } from 'next';
import { getPartyDateLabel } from '@/utils/dateHelpers';
import { fetchPublicParty } from '@/lib/og';
import PartyPageClient from './PartyPageClient';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const party = await fetchPublicParty(params.id);
  if (!party) {
    return { title: 'Party not found · Temple Parties' };
  }

  const description = `${party.host} · ${getPartyDateLabel(party.date)} · ${party.doorsOpen}`;
  return {
    title: `${party.title} · Temple Parties`,
    description,
    openGraph: {
      title: party.title,
      description,
      type: 'website',
      siteName: 'Temple Parties',
      url: `/party/${party.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: party.title,
      description,
    },
  };
}

export default function PartyPage() {
  return <PartyPageClient />;
}
