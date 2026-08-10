'use client';

import Link from 'next/link';
import AppShell from '@/components/AppShell';

/** Profile shell — Epic 6 fills in view/edit + logout. */
export default function ProfilePage() {
  return (
    <AppShell>
      <div className="pb-24 lg:pb-8 max-w-xl mx-auto px-6 pt-10">
        <h1 className="text-white text-2xl font-montserrat font-semibold mb-4">
          Profile
        </h1>
        <p className="text-white/60 font-montserrat text-sm mb-8">
          Account profile lands with Epic 6 (auth UI + onboarding).
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
