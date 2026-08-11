'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_YEARS } from '@/lib/onboarding';
import { resizeAvatarFile } from '@/utils/avatarImage';

/** Profile — view, complete skipped fields, log out (Epic 6.6 / FLOW 14 lite). */
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
