'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { hostsApi } from '@/services/api';
import type { HostApplication } from '@/lib/types';

type OrgType = 'frat' | 'house' | 'other';

export default function BecomeHostPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, needsOnboarding, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<HostApplication | null>(null);
  const [isHost, setIsHost] = useState(false);

  const [orgType, setOrgType] = useState<OrgType>('frat');
  const [orgName, setOrgName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/become-host');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding?next=/become-host');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router]);

  useEffect(() => {
    if (!isAuthenticated || needsOnboarding) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await hostsApi.getMe();
        if (cancelled) return;
        setIsHost(me.isHost);
        setApplication(me.application);
        if (me.isHost) {
          router.replace('/create');
        }
      } catch {
        if (!cancelled) setError('Could not load host status');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, needsOnboarding, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const created = await hostsApi.apply({
        org_type: orgType,
        org_name: orgName.trim(),
        instagram: instagram.trim(),
        address: address.trim(),
      });
      setApplication(created);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !isAuthenticated || loading || isHost) {
    return (
      <AppShell>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        </div>
      </AppShell>
    );
  }

  const pending = application?.status === 'pending';
  const rejected = application?.status === 'rejected';

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 pt-8 pb-24">
        <h1 className="text-white text-2xl font-black font-montserrat mb-2">
          Become a host
        </h1>
        <p className="text-white/60 text-sm font-montserrat mb-6">
          List parties for your frat or house. After you submit, DM the word CLAIM
          to @tuparties from the org Instagram. We usually review the same day.
        </p>

        {pending ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-white font-montserrat font-semibold mb-1">
              Pending review
            </p>
            <p className="text-white/50 text-sm font-montserrat mb-4">
              {application.orgName} · @{application.instagram}
            </p>
            <p className="text-white/70 text-sm font-montserrat">
              DM CLAIM to @tuparties from that Instagram. You can post parties
              once this is approved.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {rejected && (
              <p className="text-sm text-red-400 font-montserrat">
                Last application was rejected. You can apply again.
              </p>
            )}
            <div className="flex gap-2">
              {(['frat', 'house', 'other'] as OrgType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrgType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase font-montserrat ${
                    orgType === t
                      ? 'bg-[#b24bf3] text-white'
                      : 'bg-zinc-800 text-white/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value.slice(0, 60))}
              placeholder="Org name"
              className="w-full px-3 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-montserrat"
            />
            <input
              required
              value={instagram}
              onChange={(e) =>
                setInstagram(e.target.value.replace(/[^a-zA-Z0-9._@]/g, '').slice(0, 31))
              }
              placeholder="@instagram"
              className="w-full px-3 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-montserrat"
            />
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 500))}
              placeholder="House address"
              className="w-full px-3 py-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-montserrat"
            />
            <p className="text-white/40 text-xs font-montserrat">
              Address stays gated behind .edu accounts.
            </p>
            {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !orgName.trim() || !instagram.trim() || !address.trim()}
              className="w-full py-3 rounded-xl bg-white text-black font-bold font-montserrat disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/profile" className="text-white/40 text-sm font-montserrat underline">
            Back to profile
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
