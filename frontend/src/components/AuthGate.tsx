'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAuthPublicPath } from '@/lib/authHelpers';
import AuthWall from '@/components/AuthWall';

/**
 * Hard account wall around the live app. Public routes (login, Azure
 * callback, onboarding, recruiter demo) render through. Wait until auth
 * has resolved so a signed-in session never flashes the wall.
 */
function AuthGateInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const { isAuthenticated, isLoading } = useAuth();

  if (isAuthPublicPath(pathname) || isLoading || isAuthenticated) {
    return <>{children}</>;
  }

  return <AuthWall>{children}</AuthWall>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <AuthGateInner>{children}</AuthGateInner>
    </Suspense>
  );
}
