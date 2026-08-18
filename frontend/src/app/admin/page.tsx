'use client';

/**
 * Admin HQ — the review desk. Two queues behind one gate (`user.isAdmin`):
 *
 *   PARTIES  submissions waiting for approval before they hit the feed
 *   HOSTS    host-account applications (approve = org identity + is_host,
 *            both flipped server-side by the approve endpoint)
 *
 * Design notes (v2 repaint): this is an internal tool, so clarity beats
 * flash — system surfaces and chips, no glow (the one-glow rule applies
 * here too). The one deliberate UX stance: everything a submission claims
 * is laid out for INSPECTION — the full uncropped flyer, the ticket link
 * as an open-me-first row, the promo rendered as the same dashed coupon
 * partygoers will see, and the org's Instagram (where the CLAIM DM must
 * come from). Approving should never require opening Supabase.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/services/api';
import { AdminParty, HostApplication } from '@/lib/types';
import { trackEvent } from '@/utils/analytics';
import { getPartyDateLabel } from '@/utils/dateHelpers';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import Pill from '@/components/ui/Pill';
import DashedCard from '@/components/ui/DashedCard';
import Toast from '@/components/Toast';

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
  const [hostTotal, setHostTotal] = useState(0);
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
      setHostTotal(data.total);
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

  const handleApproveHost = async (applicationId: string) => {
    try {
      await adminApi.approveHostApplication(applicationId);
      trackEvent('host_application_approved', { applicationId });
      setToast('Host approved');
      fetchHostApps(hostOffset);
    } catch {
      setToast('Failed to approve host');
    }
  };

  const handleRejectHost = async (applicationId: string) => {
    try {
      await adminApi.rejectHostApplication(applicationId);
      trackEvent('host_application_rejected', { applicationId });
      setToast('Host rejected');
      fetchHostApps(hostOffset);
    } catch {
      setToast('Failed to reject host');
    }
  };

  if (isLoading || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
      </div>
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  const emptyCopy =
    filter === 'pending'
      ? 'Queue clear — nothing waiting'
      : `No ${filter === 'all' ? '' : `${filter} `}${tab === 'parties' ? 'parties' : 'applications'}`;

  return (
    <div className="min-h-screen bg-black pb-12">
      <header className="pt-6 pb-4">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-temple-purple transition-colors p-1 -ml-1"
            aria-label="Back to home"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[24px] font-montserrat font-bold text-white">Admin HQ</h1>
        </div>
      </header>

      {/* One control block for both queues: which queue, then which status.
          The filter is shared on purpose — flipping tabs keeps your place
          ("show me pending" stays "show me pending"). */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 mb-4 space-y-3">
        <SegmentedTabs
          items={[
            { key: 'parties', label: 'Parties' },
            { key: 'hosts', label: 'Hosts' },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as AdminTab)}
        />
        <div className="flex gap-2">
          {filters.map(({ key, label }) => (
            <Pill
              key={key}
              tone={filter === key ? 'accent' : 'neutral'}
              size="sm"
              shape="square"
              onClick={() => setFilter(key)}
              className={filter === key ? '' : 'hover:text-white hover:border-white/60 transition-colors'}
            >
              {label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-temple-purple" />
          </div>
        ) : tab === 'parties' ? (
          parties.length === 0 ? (
            <EmptyQueue copy={emptyCopy} />
          ) : (
            <>
              <div className="space-y-3">
                {parties.map((party) => (
                  <AdminPartyCard
                    key={party.id}
                    party={party}
                    onApprove={() => handleApprove(party.id)}
                    onReject={() => handleReject(party.id)}
                  />
                ))}
              </div>
              <Pager offset={offset} total={total} onPage={fetchParties} />
            </>
          )
        ) : hostApps.length === 0 ? (
          <EmptyQueue copy={emptyCopy} />
        ) : (
          <>
            <div className="space-y-3">
              {hostApps.map((app) => (
                <AdminHostCard
                  key={app.id}
                  app={app}
                  onApprove={() => handleApproveHost(app.id)}
                  onReject={() => handleRejectHost(app.id)}
                />
              ))}
            </div>
            <Pager offset={hostOffset} total={hostTotal} onPage={fetchHostApps} />
          </>
        )}
      </div>

      <Toast message={toast ?? ''} isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
}

/**
 * Status chip — deliberately the SAME styles as the profile page's listing
 * chips (LIVE / IN REVIEW / REJECTED), so a host's view of their party and
 * the admin's view of it speak one language. `liveLabel` exists because an
 * approved application reads better as APPROVED than LIVE.
 */
function StatusChip({ status, liveLabel = 'LIVE' }: { status: string; liveLabel?: string }) {
  const styles: Record<string, { label: string; cls: string }> = {
    pending: { label: 'IN REVIEW', cls: 'border border-amber-400/40 text-amber-300' },
    approved: { label: liveLabel, cls: 'bg-temple-purple-light text-black' },
    rejected: { label: 'REJECTED', cls: 'border border-red-500/40 text-red-400' },
  };
  const s = styles[status] ?? { label: status.toUpperCase(), cls: 'border border-white/20 text-temple-muted' };
  return (
    <span className={`inline-flex px-2 py-[3px] rounded text-[10px] font-montserrat font-bold uppercase tracking-[0.8px] ${s.cls}`}>
      {s.label}
    </span>
  );
}

/** The fused APPROVE / REJECT footer both card types share. Approve is the
 *  primary (purple) action; reject is quiet red text — a mis-tap magnet if
 *  it were a full red slab. */
function ReviewActions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex border-t border-white/10">
      <button
        type="button"
        onClick={onApprove}
        className="flex-1 h-12 bg-temple-purple text-white font-montserrat font-bold text-[13px] uppercase tracking-[0.8px] hover:opacity-90 active:scale-[0.99] transition-all duration-150"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={onReject}
        className="flex-1 h-12 text-red-400 font-montserrat font-bold text-[13px] uppercase tracking-[0.8px] border-l border-white/10 hover:bg-red-500/10 active:scale-[0.99] transition-all duration-150"
      >
        Reject
      </button>
    </div>
  );
}

/** A party submission, laid out for inspection: full uncropped flyer, every
 *  claim the host made, and the two fields that deserve a click before
 *  approval (ticket link, promo). */
function AdminPartyCard({
  party,
  onApprove,
  onReject,
}: {
  party: AdminParty;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <article className="bg-temple-surface-2 border border-white/10 rounded-2xl overflow-hidden animate-slide-up-fade">
      {party.posterImage && (
        // object-contain, not cover: flyers are 4:5 and the reviewer needs
        // the WHOLE image (crops are where the sketchy stuff hides).
        <div className="bg-black/40 border-b border-white/5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={party.posterImage}
            alt={`${party.title} poster`}
            className="max-h-[300px] w-auto object-contain"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <StatusChip status={party.status || 'pending'} />
          <Pill tone="accent" size="xs" shape="square">{party.category}</Pill>
          <span className="ml-auto text-temple-muted text-[11px] font-montserrat font-bold tracking-[0.5px]">
            {getPartyDateLabel(party.date)}
          </span>
        </div>

        <div>
          <h3 className="text-white font-montserrat font-bold text-[18px] leading-6">{party.title}</h3>
          <p className="text-temple-purple-light text-[13.5px] font-montserrat mt-0.5">by {party.host}</p>
        </div>

        <p className="text-temple-muted text-[13px] font-montserrat leading-relaxed">
          {party.doorsOpen}
          {party.doorsClose ? ` – ${party.doorsClose}` : ''} · {party.address} · pin &ldquo;{party.pinLabel}&rdquo;
          {party.ticketPrice ? ` · ${party.ticketPrice}` : ''}
        </p>

        <p className="text-temple-muted text-[12px] font-montserrat">
          Submitted by <span className="text-white/80">{party.createdByUsername || 'unknown'}</span>
          {party.createdByEmail && <span> · {party.createdByEmail}</span>}
        </p>

        {party.ticketUrl && (
          <a
            href={party.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 border border-white/15 rounded-[10px] px-3 py-2.5 hover:border-temple-purple transition-colors"
          >
            <span className="min-w-0">
              <span className="block font-montserrat font-bold text-[10px] tracking-[0.8px] uppercase text-temple-muted">
                Ticket link — open it before approving
              </span>
              <span className="block text-temple-purple-light text-[13px] font-montserrat truncate">
                {party.ticketUrl}
              </span>
            </span>
            <span className="shrink-0 text-temple-muted" aria-hidden>↗</span>
          </a>
        )}

        {party.promoCode && (
          // Rendered as the same dashed coupon partygoers get — the admin
          // reviews exactly what will ship.
          <DashedCard className="px-3 py-2.5">
            <p className="font-montserrat font-bold text-[10px] tracking-[0.8px] uppercase text-temple-muted">
              Promo{party.promoLabel ? ` · ${party.promoLabel}` : ''}
            </p>
            <p className="text-white font-montserrat font-bold text-[15px] tracking-[2px]">{party.promoCode}</p>
            {party.promoHint && (
              <p className="text-temple-muted text-[12px] font-montserrat mt-0.5">{party.promoHint}</p>
            )}
          </DashedCard>
        )}

        {party.description && (
          <p className="text-white/70 text-[13px] font-montserrat leading-relaxed whitespace-pre-wrap">
            {party.description}
          </p>
        )}
      </div>

      {party.status === 'pending' && <ReviewActions onApprove={onApprove} onReject={onReject} />}
    </article>
  );
}

/** A host application. The Instagram row is the review itself: approval
 *  hinges on the CLAIM DM arriving from this exact handle. */
function AdminHostCard({
  app,
  onApprove,
  onReject,
}: {
  app: HostApplication;
  onApprove: () => void;
  onReject: () => void;
}) {
  const handle = app.instagram.replace(/^@/, '');
  return (
    <article className="bg-temple-surface-2 border border-white/10 rounded-2xl overflow-hidden animate-slide-up-fade">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <StatusChip status={app.status} liveLabel="APPROVED" />
          <Pill tone="neutral" size="xs" shape="square">{app.orgType}</Pill>
          {app.createdAt && (
            <span className="ml-auto text-temple-muted text-[11px] font-montserrat">
              {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-white font-montserrat font-bold text-[17px] leading-6">{app.orgName}</h3>
          <p className="text-temple-muted text-[13px] font-montserrat mt-0.5">{app.address}</p>
        </div>

        <a
          href={`https://www.instagram.com/${handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border border-white/15 rounded-[10px] px-3 py-2.5 hover:border-temple-purple transition-colors"
        >
          <span className="min-w-0">
            <span className="block font-montserrat font-bold text-[10px] tracking-[0.8px] uppercase text-temple-muted">
              Instagram — the CLAIM DM must come from here
            </span>
            <span className="block text-temple-purple-light text-[13px] font-montserrat truncate">@{handle}</span>
          </span>
          <span className="shrink-0 text-temple-muted" aria-hidden>↗</span>
        </a>

        <p className="text-temple-muted text-[12px] font-montserrat">
          Applied by <span className="text-white/80">{app.applicantUsername || 'unknown'}</span>
          {app.applicantEmail && <span> · {app.applicantEmail}</span>}
        </p>
      </div>

      {app.status === 'pending' && <ReviewActions onApprove={onApprove} onReject={onReject} />}
    </article>
  );
}

/** Empty queue — the dashed "special slot" treatment; an empty pending
 *  queue is good news, not an error state. */
function EmptyQueue({ copy }: { copy: string }) {
  return (
    <DashedCard className="py-10 text-center mt-2">
      <p className="font-montserrat font-bold text-[11px] tracking-[0.88px] uppercase text-temple-muted">{copy}</p>
    </DashedCard>
  );
}

/** Prev / next pager — hidden entirely when one page holds everything. */
function Pager({ offset, total, onPage }: { offset: number; total: number; onPage: (o: number) => void }) {
  if (total <= PAGE_SIZE) return null;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + PAGE_SIZE, total);
  const btn =
    'px-4 py-2 rounded-[10px] border border-white/15 bg-temple-surface text-white text-[12px] font-montserrat font-bold uppercase tracking-[0.5px] disabled:opacity-30 disabled:cursor-not-allowed hover:border-white/35 transition-colors';
  return (
    <div className="flex items-center justify-between mt-5 gap-3">
      <button type="button" disabled={!canPrev} onClick={() => onPage(Math.max(0, offset - PAGE_SIZE))} className={btn}>
        Prev
      </button>
      <span className="text-temple-muted text-[12px] font-montserrat">
        {start}–{end} of {total}
      </span>
      <button type="button" disabled={!canNext} onClick={() => onPage(offset + PAGE_SIZE)} className={btn}>
        Next
      </button>
    </div>
  );
}
