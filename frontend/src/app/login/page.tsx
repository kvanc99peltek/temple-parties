'use client';

import Link from 'next/link';

/** Auth shell — Epic 6: .edu email → 6-digit OTP. No bottom nav. */
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-white text-2xl font-montserrat font-semibold mb-4">
          Sign in
        </h1>
        <p className="text-white/60 font-montserrat text-sm mb-8">
          Temple .edu email + 6-digit code lands in Epic 6. Backend OTP path is already live on
          Epic 3.
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
