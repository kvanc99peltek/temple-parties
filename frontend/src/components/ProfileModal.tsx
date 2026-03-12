'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ModalWrapper from './ModalWrapper';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  partyCount: number;
  onLogout: () => void;
}

export default function ProfileModal({ isOpen, onClose, username, partyCount, onLogout }: ProfileModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleAdminClick = () => {
    onClose();
    router.push('/admin');
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      {/* Avatar */}
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 rounded-full bg-[#08CA66] flex items-center justify-center">
          <span className="text-3xl font-bold text-white">
            {username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Username */}
      <h2 className="text-2xl font-semibold text-white text-center mb-6">
        {username}
      </h2>

      {/* Stats */}
      <div className="border-t border-zinc-800 py-4 mb-4">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <span className="text-xl">🎉</span>
          <span>{partyCount} {partyCount === 1 ? 'party' : 'parties'} created</span>
        </div>
      </div>

      {/* Admin button */}
      {user?.isAdmin && (
        <button
          onClick={handleAdminClick}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-[#08CA66] hover:bg-[#39D680] shadow-lg shadow-[#08CA66]/30 transition-all duration-200 active:scale-95 mb-3 font-montserrat"
        >
          Admin Dashboard
        </button>
      )}

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 px-6 rounded-xl font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200 active:scale-95"
      >
        Sign Out
      </button>
    </ModalWrapper>
  );
}
