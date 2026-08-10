'use client';

import Link from 'next/link';

/** Onboarding shell — Epic 6 builds the FLOW 2 steps. No bottom nav. */
export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-white text-2xl font-montserrat font-semibold mb-4">
          Onboarding
        </h1>
        <p className="text-white/60 font-montserrat text-sm mb-8">
          School year → username → avatar → Greek life → Instagram lands in Epic 6.
        </p>
        <Link
          href="/"
          className="inline-block text-[#b24bf3] font-montserrat font-semibold underline"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
