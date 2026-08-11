'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import GoingButton from '@/components/GoingButton';
import ThumbsRating from '@/components/ThumbsRating';
import RatingModal from '@/components/RatingModal';
import InviteModal from '@/components/InviteModal';
import Toast from '@/components/Toast';
import RequireOnboarding from '@/components/RequireOnboarding';
import { partiesApi } from '@/services/api';
import type { Party } from '@/lib/types';
import useGoingStatus from '@/hooks/useGoingStatus';
import useRatingStatus from '@/hooks/useRatingStatus';
import useModalState from '@/hooks/useModalState';
import useToast from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { openMapsDirections, shareContent } from '@/utils/shareHelpers';
import { getDayName } from '@/utils/dateHelpers';
import { trackEvent } from '@/utils/analytics';

export default function PartyPage() {
  const params = useParams();
  const router = useRouter();
  const partyId = typeof params.id === 'string' ? params.id : '';
  const { isAuthenticated } = useAuth();
  const { isGoing, getCount, toggleGoing, ensureGoing } = useGoingStatus();
  const { getUserRating, getLikePercentage, getRatingCount, submitRating } = useRatingStatus();
  const toast = useToast();
  const modals = useModalState(isAuthenticated, toggleGoing);
  const {
    requireAuthForGoing,
    requireAuthForRating,
    openLogin,
    showInviteModal,
    closeInviteModal,
    openInviteModal,
  } = modals;

  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!partyId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await partiesApi.getParty(partyId);
        if (!cancelled) setParty(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partyId, isAuthenticated]);

  const handleGoing = useCallback(async () => {
    if (!party) return;
    if (requireAuthForGoing(party.id, `/party/${party.id}`)) return;
    const wasGoing = isGoing(party.id);
    await toggleGoing(party.id);
    trackEvent('going_toggled', { partyId: party.id, action: wasGoing ? 'unmarked' : 'marked', source: 'party_page' });
    if (!wasGoing) openInviteModal();
  }, [party, requireAuthForGoing, isGoing, toggleGoing, openInviteModal]);

  const handleNavigate = useCallback(async () => {
    if (!party?.address) {
      if (!isAuthenticated) openLogin(undefined, `/party/${partyId}`);
      return;
    }
    if (requireAuthForGoing(party.id, `/party/${party.id}`)) return;
    void ensureGoing(party.id);
    openMapsDirections(party.address);
    trackEvent('navigate_clicked', { partyId: party.id, source: 'party_page' });
  }, [party, partyId, isAuthenticated, openLogin, requireAuthForGoing, ensureGoing]);

  const handleRateOpen = useCallback(() => {
    if (!party) return;
    if (requireAuthForRating(`/party/${party.id}`)) return;
    if (!party.ratingOpen) {
      toast.show('Ratings unlock when doors open');
      return;
    }
    if (party.ratingLocked) {
      toast.show('Ratings are now closed');
      return;
    }
    setShowRatingModal(true);
  }, [party, requireAuthForRating, toast]);

  const handleRate = useCallback(async (rating: number) => {
    if (!party) return;
    await submitRating(party.id, rating);
    trackEvent('party_rated', { partyId: party.id, rating, source: 'party_page' });
  }, [party, submitRating]);

  const handleShare = useCallback(async () => {
    if (!party) return;
    const result = await shareContent(party);
    trackEvent('party_shared', { method: result.method, success: result.success, partyId: party.id });
    if (result.success && result.method === 'clipboard') {
      toast.show('Link copied to clipboard!');
    }
  }, [party, toast]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      </AppShell>
    );
  }

  if (notFound || !party) {
    return (
      <AppShell>
        <div className="pb-24 max-w-xl mx-auto px-6 pt-10">
          <h1 className="text-white text-2xl font-montserrat font-semibold mb-4">Party not found</h1>
          <Link href="/" className="text-[#b24bf3] font-montserrat font-semibold underline">
            Back to Home
          </Link>
        </div>
      </AppShell>
    );
  }

  const goingCount = getCount(party.id, party.goingCount);
  const likePct = getLikePercentage(party.id, party.likePercentage);
  const ratingCount = getRatingCount(party.id, party.ratingCount);
  const userRating = getUserRating(party.id);

  return (
    <AppShell>
      <RequireOnboarding>
        <div className="pb-24 lg:pb-8 max-w-xl mx-auto">
          <div className="relative w-full aspect-[4/5] bg-[rgba(40,40,40,0.5)]">
            {party.posterImage ? (
              <Image
                src={party.posterImage}
                alt={`${party.title} poster`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 576px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#b24bf3]/30 to-[#252525] flex items-center justify-center">
                <span className="text-white/20 font-montserrat font-bold text-4xl text-center px-6">
                  {party.title}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-montserrat"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-montserrat"
            >
              Share
            </button>
          </div>

          <div className="px-6 pt-5">
            <div className="flex gap-2 mb-3">
              <span className="inline-flex px-2 py-1 bg-[#b24bf3] rounded-full text-[10px] font-helvetica font-medium text-white uppercase">
                {party.category}
              </span>
              {party.isVerified && (
                <span className="inline-flex px-2 py-1 bg-[#e0d4ff] rounded-full text-[10px] font-helvetica font-medium text-[#0b0b0b] uppercase">
                  Verified
                </span>
              )}
            </div>

            <h1 className="text-white text-3xl font-montserrat font-bold mb-1">{party.title}</h1>
            <p className="text-white/80 font-montserrat text-lg mb-4">
              by <span className="font-semibold">{party.host}</span>
            </p>

            <div className="flex flex-col gap-2 mb-4 text-white/75 font-helvetica text-sm">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/clock.svg" alt="" className="w-4 h-4" />
                <span>
                  {getDayName(party.day)} · {party.doorsOpen}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/map-pin.svg" alt="" className="w-4 h-4" />
                {party.address ? (
                  <span>{party.address}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openLogin(undefined, `/party/${party.id}`)}
                    className="underline"
                  >
                    Sign in to view address
                  </button>
                )}
              </div>
              {party.ticketPrice && (
                <p className="text-white/60">Tickets: {party.ticketPrice}</p>
              )}
            </div>

            {party.description && (
              <p className="text-white/70 font-montserrat text-sm mb-6 whitespace-pre-wrap">
                {party.description}
              </p>
            )}

            <button type="button" onClick={handleRateOpen} className="mb-6">
              <ThumbsRating
                userRating={userRating}
                likePercentage={likePct}
                ratingCount={ratingCount}
                onRate={() => {}}
                disabled
                displayOnly
                size="md"
              />
            </button>

            <div className="flex gap-2">
              <GoingButton
                partyId={party.id}
                currentCount={goingCount}
                userIsGoing={isGoing(party.id)}
                onGoingClick={handleGoing}
              />
              <button
                type="button"
                onClick={handleNavigate}
                disabled={!party.address && isAuthenticated}
                className="flex-1 h-[41px] lg:h-[48px] rounded-[12px] bg-[#e0d4ff] flex items-center justify-center font-montserrat font-bold text-[#0b0b0b] disabled:opacity-50"
              >
                Navigate
              </button>
            </div>
          </div>
        </div>

        <InviteModal isOpen={showInviteModal} onClose={closeInviteModal} onShare={handleShare} />

        {showRatingModal && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            partyTitle={party.title}
            partyHost={party.host}
            likePercentage={likePct}
            ratingCount={ratingCount}
            userRating={userRating}
            onRate={handleRate}
          />
        )}

        <Toast message={toast.message} isVisible={toast.isVisible} onClose={toast.hide} />
      </RequireOnboarding>
    </AppShell>
  );
}
