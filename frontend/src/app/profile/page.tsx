'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_YEARS } from '@/lib/onboarding';
import { partiesApi } from '@/services/api';
import { resizeAvatarFile } from '@/utils/avatarImage';
import type { Party } from '@/lib/types';

/** Profile — view, complete skipped fields, my listings, log out (Epic 6.6 / 8.5). */
export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    needsOnboarding,
    updateProfile,
    uploadAvatar,
    logout,
  } = useAuth();

  const [editing, setEditing] = useState<'none' | 'school' | 'greek' | 'instagram'>('none');
  const [schoolYear, setSchoolYear] = useState('');
  const [greekLife, setGreekLife] = useState('');
  const [instagram, setInstagram] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myParties, setMyParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/profile');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router]);

  useEffect(() => {
    if (!user) return;
    setSchoolYear(user.schoolYear || '');
    setGreekLife(user.greekLife || '');
    setInstagram(user.instagram || '');
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || needsOnboarding) return;
    let cancelled = false;
    void (async () => {
      setPartiesLoading(true);
      try {
        const list = await partiesApi.getMyParties();
        if (!cancelled) setMyParties(list);
      } catch {
        if (!cancelled) setMyParties([]);
      } finally {
        if (!cancelled) setPartiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, needsOnboarding]);

  const saveField = async (fields: Parameters<typeof updateProfile>[0]) => {
    setSubmitting(true);
    setError('');
    setInfo('');
    const result = await updateProfile(fields);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Could not save');
      return false;
    }
    setInfo('Saved');
    setEditing('none');
    return true;
  };

  const onAvatarFile = async (file: File | null) => {
    if (!file) return;
    setSubmitting(true);
    setError('');
    try {
      const blob = await resizeAvatarFile(file);
      const result = await uploadAvatar(blob);
      if (!result.success) {
        setError(result.error || 'Upload failed');
      } else {
        setInfo('Photo updated');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process image');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading || !isAuthenticated || !user || needsOnboarding) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        </div>
      </AppShell>
    );
  }

  const initial = (user.username || user.email || '?').charAt(0).toUpperCase();

  return (
    <AppShell>
      <div className="pb-24 lg:pb-8 max-w-xl mx-auto px-6 pt-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-white text-2xl font-montserrat font-semibold">Profile</h1>
            <p className="text-white/50 text-sm font-montserrat mt-1">{user.email}</p>
          </div>
          <Link href="/" className="text-[#b24bf3] text-sm font-montserrat font-semibold">
            Home
          </Link>
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting}
            className="w-24 h-24 rounded-full bg-[#b24bf3] overflow-hidden flex items-center justify-center text-white text-3xl font-montserrat font-bold mb-3 disabled:opacity-60"
            aria-label="Change profile picture"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onAvatarFile(e.target.files?.[0] ?? null)}
          />
          <h2 className="text-white text-xl font-montserrat font-semibold">@{user.username}</h2>
          {user.isAdmin && (
            <Link href="/admin" className="mt-3 text-sm font-montserrat text-[#b24bf3] underline">
              Admin dashboard
            </Link>
          )}
        </div>

        <Link
          href="/create"
          className="mb-8 flex w-full items-center justify-center py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3]"
        >
          Create a party
        </Link>

        <div className="space-y-3 mb-8">
          <ProfileRow
            label="School year"
            value={SCHOOL_YEARS.find((y) => y.value === user.schoolYear)?.label || '—'}
            onEdit={() => setEditing('school')}
          />
          <ProfileRow
            label="Greek life"
            value={user.greekLife || 'Not set'}
            onEdit={() => setEditing('greek')}
            muted={!user.greekLife}
          />
          <ProfileRow
            label="Instagram"
            value={user.instagram ? `@${user.instagram}` : 'Not set'}
            onEdit={() => setEditing('instagram')}
            muted={!user.instagram}
          />
        </div>

        {editing === 'school' && (
          <EditCard title="School year" onClose={() => setEditing('none')}>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void saveField({ school_year: schoolYear });
              }}
              className="space-y-3"
            >
              {SCHOOL_YEARS.map((y) => (
                <button
                  key={y.value}
                  type="button"
                  onClick={() => setSchoolYear(y.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border font-montserrat text-sm ${
                    schoolYear === y.value
                      ? 'border-[#b24bf3] text-white'
                      : 'border-zinc-700 text-white/70'
                  }`}
                >
                  {y.label}
                </button>
              ))}
              <SaveButton disabled={submitting || !schoolYear} />
            </form>
          </EditCard>
        )}

        {editing === 'greek' && (
          <EditCard title="Greek life" onClose={() => setEditing('none')}>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void saveField({ greek_life: greekLife.trim() || '' });
              }}
              className="space-y-3"
            >
              <input
                value={greekLife}
                onChange={(e) => setGreekLife(e.target.value.slice(0, 100))}
                placeholder="Chapter or org"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
              />
              <SaveButton disabled={submitting} />
            </form>
          </EditCard>
        )}

        {editing === 'instagram' && (
          <EditCard title="Instagram" onClose={() => setEditing('none')}>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                void saveField({ instagram: instagram.trim() || '' });
              }}
              className="space-y-3"
            >
              <input
                value={instagram}
                onChange={(e) =>
                  setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30))
                }
                placeholder="handle"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
              />
              <SaveButton disabled={submitting} />
            </form>
          </EditCard>
        )}

        <section className="mb-8">
          <h3 className="text-white font-montserrat font-semibold mb-3">My parties</h3>
          {partiesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#b24bf3]" />
            </div>
          ) : myParties.length === 0 ? (
            <div className="px-4 py-6 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
              <p className="text-white/50 text-sm font-montserrat mb-3">No listings yet</p>
              <Link href="/create" className="text-[#b24bf3] text-sm font-montserrat font-semibold underline">
                Create your first party
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {myParties.map((party) => (
                <MyPartyRow key={party.id} party={party} />
              ))}
            </ul>
          )}
        </section>

        {error && <p className="text-red-400 text-sm font-montserrat mb-3">{error}</p>}
        {info && <p className="text-emerald-400 text-sm font-montserrat mb-3">{info}</p>}

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10"
        >
          Log out
        </button>
      </div>
    </AppShell>
  );
}

function statusStyles(status: string | undefined): { label: string; className: string } {
  switch (status) {
    case 'approved':
      return { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-300' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-red-500/20 text-red-300' };
    case 'pending':
    default:
      return { label: 'Awaiting approval', className: 'bg-amber-500/20 text-amber-200' };
  }
}

function MyPartyRow({ party }: { party: Party }) {
  const badge = statusStyles(party.status);
  const inner = (
    <>
      <div className="min-w-0">
        <p className="text-white font-montserrat font-medium truncate">{party.title}</p>
        <p className="text-white/40 text-xs font-montserrat mt-0.5">
          {party.day === 'saturday' ? 'Sat' : 'Fri'} · {party.doorsOpen}
        </p>
      </div>
      <span className={`shrink-0 text-xs font-montserrat px-2 py-1 rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    </>
  );

  if (party.status === 'approved') {
    return (
      <Link
        href={`/party/${party.id}`}
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
      {inner}
    </div>
  );
}

function ProfileRow({
  label,
  value,
  onEdit,
  muted,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
      <div>
        <p className="text-white/40 text-xs font-montserrat uppercase tracking-wide">{label}</p>
        <p className={`font-montserrat ${muted ? 'text-white/40' : 'text-white'}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-montserrat text-[#b24bf3] font-semibold"
      >
        Edit
      </button>
    </div>
  );
}

function EditCard({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 p-4 rounded-xl border border-[#b24bf3]/40 bg-zinc-900">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-montserrat font-semibold">{title}</h3>
        <button type="button" onClick={onClose} className="text-white/50 text-sm">
          Cancel
        </button>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full py-2.5 rounded-lg bg-[#b24bf3] text-white font-montserrat font-semibold disabled:opacity-50"
    >
      Save
    </button>
  );
}
