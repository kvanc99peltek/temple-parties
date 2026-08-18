'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/services/api';
import { AdminParty, HostApplication } from '@/lib/types';
import { trackEvent } from '@/utils/analytics';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';
type AdminTab = 'parties' | 'hosts';

const PAGE_SIZE = 20;

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [parties, setParties] = useState<AdminParty[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [tab, setTab] = useState<AdminTab>('parties');
  const [hostApps, setHostApps] = useState<HostApplication[]>([]);
  const [hostOffset, setHostOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const fetchParties = useCallback(async (pageOffset: number) => {
    try {
      setLoading(true);
      const data = await adminApi.getParties(
        filter === 'all' ? undefined : filter,
        { limit: PAGE_SIZE, offset: pageOffset }
      );
      setParties(data.parties);
      setTotal(data.total);
      setOffset(data.offset);
    } catch {
      setToast('Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchHostApps = useCallback(async (pageOffset: number) => {
    try {
      setLoading(true);
      const data = await adminApi.getHostApplications(
        filter === 'all' ? undefined : filter,
        { limit: PAGE_SIZE, offset: pageOffset }
      );
      setHostApps(data.applications);
      setHostOffset(data.offset);
    } catch {
      setToast('Failed to load host applications');
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
      if (tab === 'parties') {
        setOffset(0);
        fetchParties(0);
      } else {
        setHostOffset(0);
        fetchHostApps(0);
      }
    }
  }, [user, isLoading, router, fetchParties, fetchHostApps, tab]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleApprove = async (partyId: string) => {
    try {
      await adminApi.approveParty(partyId);
      trackEvent('party_approved', { partyId });
      setToast('Party approved');
      fetchParties(offset);
    } catch {
      setToast('Failed to approve party');
    }
  };

  const handleReject = async (partyId: string) => {
    try {
      await adminApi.rejectParty(partyId);
      trackEvent('party_rejected', { partyId });
      setToast('Party rejected');
      fetchParties(offset);
    } catch {
      setToast('Failed to reject party');
    }
  };

  const handleRejectHost = async (applicationId: string) => {
    try {
      await adminApi.rejectHostApplication(applicationId);
      setToast('Host rejected');
      fetchHostApps(hostOffset);
    } catch {
      setToast('Failed to reject host');
    }
  };

  const handleApproveHost = async (applicationId: string) => {
    try {
      await adminApi.approveHostApplication(applicationId);
      setToast('Host approved');
      fetchHostApps(hostOffset);
    } catch {
      setToast('Failed to approve host');
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

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-[#b24bf3] transition-colors p-1"
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

      <div className="max-w-xl mx-auto px-4 sm:px-6 mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('parties')}
          className={`px-4 py-2 rounded-xl text-sm font-bold font-montserrat ${
            tab === 'parties' ? 'bg-white text-black' : 'bg-zinc-800 text-gray-400'
          }`}
        >
          Parties
        </button>
        <button
          type="button"
          onClick={() => setTab('hosts')}
          className={`px-4 py-2 rounded-xl text-sm font-bold font-montserrat ${
            tab === 'hosts' ? 'bg-white text-black' : 'bg-zinc-800 text-gray-400'
          }`}
        >
          Hosts
        </button>
      </div>

      {tab === 'parties' && (
      <>
      {/* Status Filters */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 mb-4">
        <div className="flex gap-2">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold font-montserrat transition-all duration-200 ${
                filter === key
                  ? 'bg-[#b24bf3] text-white shadow-lg shadow-[#b24bf3]/25'
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
            <p className="text-[#b24bf3] text-center font-montserrat text-sm">
              {filter === 'pending' ? 'Nothing to review right now' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {parties.map((party) => (
                <div
                  key={party.id}
                  className="bg-[#202023] rounded-2xl overflow-hidden"
                >
                  {party.posterImage && (
                    <div className="relative w-full aspect-[16/9] bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={party.posterImage}
                        alt={`${party.title} poster`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
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
                      <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase bg-[#b24bf3] text-white rounded-full font-montserrat">
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
                    <div className="flex items-center gap-4 text-white/50 text-sm font-helvetica mb-2">
                      <span>{party.address?.split(',')[0] ?? '—'}</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{party.doorsOpen}</span>
                      </div>
                      <span>{party.date}</span>
                    </div>

                    {party.ticketPrice && (
                      <p className="text-sm text-white/70 font-helvetica mb-2">
                        Ticket: <span className="text-white font-medium">{party.ticketPrice}</span>
                      </p>
                    )}

                    {party.description && (
                      <p className="text-sm text-white/60 font-helvetica leading-relaxed whitespace-pre-wrap">
                        {party.description}
                      </p>
                    )}
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

            {/* Pager */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-6 gap-3">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => fetchParties(Math.max(0, offset - PAGE_SIZE))}
                  className="px-4 py-2 rounded-xl text-sm font-bold font-montserrat bg-zinc-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-400 font-montserrat">
                  {pageStart}–{pageEnd} of {total}
                </span>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => fetchParties(offset + PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl text-sm font-bold font-montserrat bg-zinc-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </>
      )}

      {tab === 'hosts' && (
      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-8">
        <div className="flex gap-2 mb-4">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold font-montserrat ${
                filter === key
                  ? 'bg-[#b24bf3] text-white'
                  : 'bg-zinc-800 text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <p className="text-gray-400 font-montserrat text-center py-16">Loading hosts...</p>
        ) : hostApps.length === 0 ? (
          <p className="text-gray-400 font-montserrat text-center py-16">No applications</p>
        ) : (
          <div className="space-y-3">
            {hostApps.map((app) => (
              <div key={app.id} className="bg-[#202023] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={app.status} />
                  <span className="text-[10px] font-bold uppercase text-white/50 font-montserrat">
                    {app.orgType}
                  </span>
                </div>
                <h3 className="text-white font-black font-montserrat mb-1">{app.orgName}</h3>
                <p className="text-white/50 text-sm font-montserrat">@{app.instagram}</p>
                <p className="text-white/50 text-sm font-montserrat mb-2">{app.address}</p>
                <p className="text-xs text-gray-500 font-montserrat mb-3">
                  {app.applicantUsername || 'Unknown'} {app.applicantEmail}
                </p>
                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveHost(app.id)}
                      className="flex-1 h-11 font-bold uppercase bg-[#10B981] text-white font-montserrat rounded-xl"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectHost(app.id)}
                      className="flex-1 h-11 font-bold uppercase bg-red-500 text-white font-montserrat rounded-xl"
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
      )}

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
