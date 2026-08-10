'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <header className="bg-black pt-10 pb-4 lg:hidden">
      <div className="max-w-xl lg:max-w-3xl mx-auto px-6 lg:px-8 flex items-start justify-between gap-4">
        <h1 className="text-[36px] leading-[27px] lg:text-[44px] lg:leading-[34px] font-normal text-white font-bitcount">
          {title ?? (
            <>
              Temple
              <br />
              Parties
            </>
          )}
        </h1>
        {!isLoading && (
          <Link
            href={isAuthenticated ? '/profile' : '/login'}
            className="mt-1 shrink-0 text-sm font-montserrat font-semibold text-[#b24bf3]"
          >
            {isAuthenticated ? (user?.username ? `@${user.username}` : 'Profile') : 'Log in'}
          </Link>
        )}
      </div>
    </header>
  );
}
