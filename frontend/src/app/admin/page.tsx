'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/services/api';
import { AdminParty } from '@/lib/types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [parties, setParties] = useState<AdminParty[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getParties(filter === 'all' ? undefined : filter);
      setParties(data);
    } catch {
      setToast('Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.push('/');
      return;
    }
    if (user?.isAdmin) {
      fetchParties();
    }
  }, [user, isLoading, router, fetchParties]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApprove = async (partyId: string) => {
    try {
      await adminApi.approveParty(partyId);
      setToast('Party approved');
      fetchParties();
    } catch {
      setToast('Failed to approve party');
    }
  };

  const handleReject = async (partyId: string) => {
    try {
      await adminApi.rejectParty(partyId);
      setToast('Party rejected');
      fetchParties();
    } catch {
      setToast('Failed to reject party');
    }
  };

  if (isLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400 font-montserrat">Loading...</div>
      </div>
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-[#08CA66] transition-colors p-1"
            aria-label="Back to home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-montserrat tracking-tight">
            Admin Dashboard
          </h1>
        </div>
      </header>

      {/* Status Filters */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 mb-4">
        <div className="flex gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold font-montserrat transition-all duration-200 ${
                filter === key
                  ? 'bg-[#08CA66] text-white shadow-lg shadow-[#08CA66]/25'
                  : 'bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Party List */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-gray-400 font-montserrat">Loading parties...</div>
          </div>
        ) : parties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <h2 className="text-xl font-semibold text-gray-400 mb-2 text-center font-montserrat">
              No {filter === 'all' ? '' : filter} parties
            </h2>
            <p className="text-[#08CA66] text-center font-montserrat text-sm">
              {filter === 'pending' ? 'Nothing to review right now' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {parties.map((party) => (
              <div
                key={party.id}
                className="bg-[#202023] rounded-2xl overflow-hidden"
              >
                <div className="p-5">
                  {/* Submitter Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-400">
                        {(party.createdByUsername || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-helvetica">
                      <span className="font-medium text-gray-300">{party.createdByUsername || 'Unknown'}</span>
                      {party.createdByEmail && (
                        <span className="ml-1.5 text-gray-500">{party.createdByEmail}</span>
                      )}
                    </div>
                  </div>

                  {/* Category + Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase bg-[#08CA66] text-white rounded-full font-montserrat">
                      {party.category}
                    </span>
                    <StatusBadge status={party.status || 'pending'} />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black text-white font-montserrat tracking-tight leading-tight mb-1">
                    {party.title}
                  </h3>

                  {/* Host */}
                  <p className="text-white/50 text-sm font-helvetica mb-1">
                    <span className="font-normal">by </span>
                    <span className="font-medium">{party.host}</span>
                  </p>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-white/50 text-sm font-helvetica">
                    <span>{party.address?.split(',')[0] ?? '—'}</span>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{party.doorsOpen}</span>
                    </div>
                    <span>{party.date}</span>
                  </div>
                </div>

                {/* Action Buttons (pending only) */}
                {party.status === 'pending' && (
                  <div className="flex">
                    <button
                      onClick={() => handleApprove(party.id)}
                      className="flex-1 h-[49px] font-bold text-base uppercase bg-[#10B981] text-white hover:opacity-90 active:scale-[0.98] transition-all duration-150 font-montserrat"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(party.id)}
                      className="flex-1 h-[49px] font-bold text-base uppercase bg-red-500 text-white hover:opacity-90 active:scale-[0.98] transition-all duration-150 font-montserrat"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-xl font-montserrat text-sm shadow-lg animate-fade-in z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-[#FFD666] text-black',
    approved: 'bg-[#10B981] text-white',
    rejected: 'bg-red-500 text-white',
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg font-montserrat ${styles[status] || 'bg-zinc-700 text-gray-400'}`}>
      {status}
    </span>
  );
}
