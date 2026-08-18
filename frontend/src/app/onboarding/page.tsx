'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import {
  ONBOARDING_STEPS,
  SCHOOL_YEARS,
  USERNAME_PATTERN,
  firstIncompleteStep,
  writeOnboardingComplete,
  type OnboardingStep,
} from '@/lib/onboarding';
import { resizeAvatarFile } from '@/utils/avatarImage';
import { trackEvent } from '@/utils/analytics';
import type { User } from '@/lib/types';
import type { AuthUser } from '@/contexts/AuthContext';

function toProfileUser(user: AuthUser): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    is_admin: user.isAdmin,
    created_at: user.createdAt,
    school_year: user.schoolYear,
    greek_life: user.greekLife,
    instagram: user.instagram,
    avatar_url: user.avatarUrl,
  };
}

/**
 * FLOW 2 onboarding: school year → username → avatar → greek → instagram → home.
 * Required: school year + username. Optional steps offer Skip (completable later on /profile).
 */
function OnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const {
    user,
    isAuthenticated,
    isLoading,
    needsOnboarding,
    updateProfile,
    uploadAvatar,
    refreshUser,
  } = useAuth();

  const [flowActive, setFlowActive] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('school-year');
  const [schoolYear, setSchoolYear] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');
  const [greekLife, setGreekLife] = useState('');
  const [instagram, setInstagram] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const safeNext = nextPath.startsWith('/') ? nextPath : '/';

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace('/login?next=/onboarding');
      return;
    }

    // Already past required fields and not mid-flow → resume soft-gate destination.
    if (!needsOnboarding && !flowActive) {
      router.replace(safeNext);
      return;
    }

    if (flowActive || !user) return;

    setFlowActive(true);
    setStep(firstIncompleteStep(toProfileUser(user)));
    if (user.schoolYear) setSchoolYear(user.schoolYear);
    if (user.username) setUsername(user.username);
    if (user.greekLife) setGreekLife(user.greekLife);
    if (user.instagram) setInstagram(user.instagram);
    if (user.avatarUrl) setPreviewUrl(user.avatarUrl);
  }, [flowActive, isAuthenticated, isLoading, needsOnboarding, router, safeNext, user]);

  const runUsernameCheck = useCallback((value: string) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    const cleaned = value.trim();
    if (!cleaned) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(cleaned)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const result = await authApi.checkUsernameAvailable(cleaned);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 350);
  }, []);

  const finishOnboarding = useCallback(async () => {
    if (user?.id) writeOnboardingComplete(user.id);
    trackEvent('onboarding_completed', {
      has_avatar: !!(pendingBlob || user?.avatarUrl),
      has_greek_life: !!greekLife.trim(),
      has_instagram: !!instagram.trim(),
    });
    await refreshUser();
    setFlowActive(false);
    router.replace(safeNext);
  }, [greekLife, instagram, pendingBlob, refreshUser, router, safeNext, user?.avatarUrl, user?.id]);

  const goNext = useCallback(() => {
    const next = ONBOARDING_STEPS[stepIndex + 1];
    if (next) {
      setStep(next);
      setError('');
      return;
    }
    void finishOnboarding();
  }, [finishOnboarding, stepIndex]);

  const saveSchoolYear = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolYear) return;
    setSubmitting(true);
    setError('');
    const result = await updateProfile({ school_year: schoolYear });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Could not save school year');
      return;
    }
    goNext();
  };

  const saveUsername = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = username.trim();
    if (!USERNAME_PATTERN.test(cleaned) || usernameStatus === 'taken') return;
    setSubmitting(true);
    setError('');
    const result = await updateProfile({ username: cleaned });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Could not save username');
      if (/taken/i.test(result.error || '')) setUsernameStatus('taken');
      return;
    }
    goNext();
  };

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    setError('');
    try {
      const blob = await resizeAvatarFile(file);
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
      setPendingBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process image');
    }
  };

  const saveAvatar = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingBlob) {
      goNext();
      return;
    }
    setSubmitting(true);
    setError('');
    const result = await uploadAvatar(pendingBlob);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Upload failed');
      return;
    }
    setPendingBlob(null);
    goNext();
  };

  const saveGreek = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    if (greekLife.trim()) {
      const result = await updateProfile({ greek_life: greekLife.trim() });
      if (!result.success) {
        setSubmitting(false);
        setError(result.error || 'Could not save');
        return;
      }
    }
    setSubmitting(false);
    goNext();
  };

  const saveInstagram = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    if (instagram.trim()) {
      const result = await updateProfile({ instagram: instagram.trim() });
      if (!result.success) {
        setSubmitting(false);
        setError(result.error || 'Could not save');
        return;
      }
    }
    setSubmitting(false);
    await finishOnboarding();
  };

  const usernameHint = useMemo(() => {
    switch (usernameStatus) {
      case 'checking':
        return 'Checking…';
      case 'available':
        return 'Available';
      case 'taken':
        return 'Already taken';
      case 'invalid':
        return '2–30 letters, numbers, or underscore';
      default:
        return '2–30 letters, numbers, or underscore';
    }
  }, [usernameStatus]);

  if (isLoading || !isAuthenticated || (!flowActive && needsOnboarding === false)) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
      </div>
    );
  }

  if (!flowActive) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <Link href="/" className="inline-block text-[28px] leading-[22px] font-bitcount text-white mb-6">
          Temple
          <br />
          Parties
        </Link>
        <div className="flex gap-1.5 mb-4">
          {ONBOARDING_STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                i <= stepIndex ? 'bg-[#b24bf3]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

        {step === 'school-year' && (
          <form onSubmit={saveSchoolYear} className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">School year</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">Required — helps hosts know the crowd.</p>
            </div>
            <div className="grid gap-2">
              {SCHOOL_YEARS.map((y) => (
                <button
                  key={y.value}
                  type="button"
                  onClick={() => setSchoolYear(y.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl font-montserrat border transition-colors ${
                    schoolYear === y.value
                      ? 'border-[#b24bf3] bg-[#b24bf3]/15 text-white'
                      : 'border-zinc-700 bg-zinc-900 text-white/80 hover:border-zinc-500'
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!schoolYear || submitting}
              className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'username' && (
          <form onSubmit={saveUsername} className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Choose a username</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">This is how others will see you.</p>
            </div>
            <div>
              <input
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
                  setUsername(v);
                  setError('');
                  runUsernameCheck(v);
                }}
                placeholder="owl_party"
                className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-white/40 font-montserrat focus:border-[#b24bf3] outline-none"
              />
              <p
                className={`text-sm mt-2 font-montserrat ${
                  usernameStatus === 'available'
                    ? 'text-emerald-400'
                    : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'text-red-400'
                      : 'text-white/40'
                }`}
              >
                {usernameHint}
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={
                submitting ||
                !USERNAME_PATTERN.test(username.trim()) ||
                usernameStatus === 'taken' ||
                usernameStatus === 'checking'
              }
              className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'avatar' && (
          <form onSubmit={saveAvatar} className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Profile picture</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">Optional — you can add one later.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-full bg-zinc-900 border border-zinc-700 overflow-hidden flex items-center justify-center text-white/50 font-montserrat text-sm hover:border-[#b24bf3]"
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  'Add photo'
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void onPickAvatar(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
            >
              {submitting ? 'Uploading…' : 'Continue'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => goNext()}
              className="w-full py-2 text-sm font-montserrat text-white/50 hover:text-white"
            >
              Skip for now
            </button>
          </form>
        )}

        {step === 'greek-life' && (
          <form onSubmit={saveGreek} className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Greek life</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">Optional — chapter or org name.</p>
            </div>
            <input
              type="text"
              value={greekLife}
              onChange={(e) => setGreekLife(e.target.value.slice(0, 100))}
              placeholder="e.g. AEPi"
              className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-white/40 font-montserrat focus:border-[#b24bf3] outline-none"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Continue'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => goNext()}
              className="w-full py-2 text-sm font-montserrat text-white/50 hover:text-white"
            >
              Skip for now
            </button>
          </form>
        )}

        {step === 'instagram' && (
          <form onSubmit={saveInstagram} className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Instagram</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">Optional — just the handle.</p>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-montserrat">@</span>
              <input
                type="text"
                value={instagram}
                onChange={(e) =>
                  setInstagram(e.target.value.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30))
                }
                placeholder="temple_owl"
                className="w-full pl-8 pr-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-white/40 font-montserrat focus:border-[#b24bf3] outline-none"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
            >
              {submitting ? 'Finishing…' : 'Finish'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void finishOnboarding()}
              className="w-full py-2 text-sm font-montserrat text-white/50 hover:text-white"
            >
              Skip for now
            </button>
          </form>
        )}
      </div>
  );
}

/** FLOW 2 onboarding. Required: school year + username. Optional steps offer Skip. */
export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        }
      >
        <OnboardingFlow />
      </Suspense>
    </main>
  );
}
