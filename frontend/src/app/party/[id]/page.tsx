'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';

/**
 * Party detail shell — full detail lands in Epic 7.
 * Deep links and share URLs point here now.
 */
export default function PartyPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <div className="pb-24 lg:pb-8 max-w-xl mx-auto px-6 pt-10">
        <p className="text-white/50 text-sm font-montserrat mb-2">Party</p>
        <h1 className="text-white text-2xl font-montserrat font-semibold mb-4">
          Coming soon
        </h1>
        <p className="text-white/60 font-montserrat text-sm mb-8">
          Party detail for <span className="text-white/80 font-mono">{params.id}</span> will
          land in Epic 7. For now, browse from Home or Map.
        </p>
        <Link
          href="/"
          className="inline-block text-[#b24bf3] font-montserrat font-semibold underline"
        >
          Back to Home
        </Link>
      </div>
    </AppShell>
  );
}
