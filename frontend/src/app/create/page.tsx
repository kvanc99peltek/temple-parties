'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import WeekendCalendarPicker, {
  formatWeekendRange,
  type WeekendOption,
} from '@/components/WeekendCalendarPicker';
import { useAuth } from '@/contexts/AuthContext';
import { partiesApi, hostsApi } from '@/services/api';
import { resizePosterFile } from '@/utils/posterImage';
import { trackEvent } from '@/utils/analytics';

const DOOR_TIMES = ['9 PM', '10 PM', '11 PM', '12 AM'];
const CATEGORIES = ['Frat Party', 'House Party', 'House Show', 'Rooftop Party', 'Other'];

type Step = 'basics' | 'poster' | 'description' | 'ticket' | 'done';

const STEPS: Step[] = ['basics', 'poster', 'description', 'ticket', 'done'];

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * FLOW 8 create-party (Epic 8.3/8.4): multi-step host submission → pending.
 */
export default function CreatePartyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, needsOnboarding } = useAuth();

  const [step, setStep] = useState<Step>('basics');
  const [title, setTitle] = useState('');
  const [host, setHost] = useState('');
  const [pinLabel, setPinLabel] = useState('');
  const [address, setAddress] = useState('');
  const [doorsOpen, setDoorsOpen] = useState(DOOR_TIMES[1]);
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [date, setDate] = useState('');
  const [todayIso, setTodayIso] = useState('');
  const [weekends, setWeekends] = useState<WeekendOption[]>([]);
  const [selectedWeekendOf, setSelectedWeekendOf] = useState('');
  const [description, setDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [posterPath, setPosterPath] = useState<string | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [pendingPosterBlob, setPendingPosterBlob] = useState<Blob | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [weekendLoading, setWeekendLoading] = useState(true);

  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressInputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hostPrefillRef = useRef(false);

  const [hostChecking, setHostChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/create');
      return;
    }
    if (needsOnboarding) {
      router.replace('/onboarding?next=/create');
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router]);

  useEffect(() => {
    if (!isAuthenticated || needsOnboarding || isLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await hostsApi.getMe();
        if (cancelled) return;
        if (!me.isHost) {
          router.replace('/become-host');
          return;
        }
        setHostChecking(false);
      } catch {
        if (!cancelled) router.replace('/become-host');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, needsOnboarding, isLoading, router]);

  useEffect(() => {
    if (!user?.username || hostPrefillRef.current) return;
    hostPrefillRef.current = true;
    setHost(user.username.slice(0, 30));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await partiesApi.getCreateOptions();
        if (cancelled) return;
        setTodayIso(data.today);
        setWeekends(data.weekends);
        const first = data.weekends[0];
        if (first) {
          setSelectedWeekendOf(first.weekendOf);
          // Prefer first day that is today or later (Sat-only when Friday already passed).
          const firstDay =
            first.fridayDate >= data.today ? first.fridayDate : first.saturdayDate;
          setDate((prev) => prev || firstDay);
        }
      } catch {
        if (!cancelled) setError('Could not load weekend dates. Refresh and try again.');
      } finally {
        if (!cancelled) setWeekendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedWeekend = weekends.find((w) => w.weekendOf === selectedWeekendOf) ?? weekends[0];

  useEffect(() => {
    return () => {
      if (posterPreview?.startsWith('blob:')) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  const fetchAddressSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      // Proxy through our API — browsers get 403 calling Nominatim directly.
      const data = await partiesApi.suggestAddresses(query);
      setAddressSuggestions(
        data.map((row) => ({
          display_name: row.display_name,
          lat: String(row.lat),
          lon: String(row.lon),
        }))
      );
    } catch {
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setCoords(null); // typing invalidates a picked suggestion's lat/lng
    if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchAddressSuggestions(value);
      setShowSuggestions(true);
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const validateBasics = (): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required';
    else if (title.length > 50) next.title = 'Title must be 50 characters or less';
    if (!host.trim()) next.host = 'Host is required';
    else if (host.length > 30) next.host = 'Host must be 30 characters or less';
    if (!pinLabel.trim()) next.pinLabel = 'Pin label is required';
    else if (pinLabel.length > 5) next.pinLabel = 'Pin label must be 5 characters or less';
    if (!address.trim()) next.address = 'Address is required';
    if (!date) next.date = 'Pick Friday or Saturday';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const onPosterFile = async (file: File | null) => {
    if (!file) return;
    setError('');
    setSubmitting(true);
    try {
      const blob = await resizePosterFile(file);
      if (posterPreview?.startsWith('blob:')) URL.revokeObjectURL(posterPreview);
      setPendingPosterBlob(blob);
      setPosterPreview(URL.createObjectURL(blob));
      setPosterPath(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process image');
    } finally {
      setSubmitting(false);
    }
  };

  const clearPoster = () => {
    if (posterPreview?.startsWith('blob:')) URL.revokeObjectURL(posterPreview);
    setPendingPosterBlob(null);
    setPosterPreview(null);
    setPosterPath(null);
  };

  const submitParty = async () => {
    setSubmitting(true);
    setError('');
    try {
      let path = posterPath;
      if (pendingPosterBlob && !path) {
        const uploaded = await partiesApi.uploadPoster(pendingPosterBlob);
        path = uploaded.path;
        setPosterPath(path);
      }

      await partiesApi.createParty({
        title: title.trim(),
        host: host.trim(),
        pin_label: pinLabel.trim(),
        category,
        date,
        doors_open: doorsOpen,
        address: address.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        description: description.trim() || undefined,
        ticket_price: ticketPrice.trim() || undefined,
        poster_image: path || undefined,
      });

      trackEvent('party_created', {
        category,
        has_poster: !!path,
        has_description: !!description.trim(),
        has_ticket_price: !!ticketPrice.trim(),
        day: date === selectedWeekend?.saturdayDate ? 'saturday' : 'friday',
        weekend_of: selectedWeekend?.weekendOf,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit party');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBasicsContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!validateBasics()) return;
    goNext();
  };

  const stepIndex = STEPS.indexOf(step);
  const progressSteps = STEPS.filter((s) => s !== 'done');

  if (isLoading || !isAuthenticated || needsOnboarding || hostChecking) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b24bf3]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-24 lg:pb-8 max-w-md mx-auto px-6 pt-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/profile" className="text-[#b24bf3] text-sm font-montserrat font-semibold">
              Back
            </Link>
            {step !== 'done' && (
              <span className="text-white/40 text-xs font-montserrat">
                Step {Math.min(stepIndex + 1, progressSteps.length)} of {progressSteps.length}
              </span>
            )}
          </div>
          {step !== 'done' && (
            <div className="flex gap-1.5 mb-6">
              {progressSteps.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${
                    i <= stepIndex ? 'bg-[#b24bf3]' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {step === 'basics' && (
          <form onSubmit={handleBasicsContinue} className="space-y-4">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Create a party</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">
                Name, location, and time for this weekend.
              </p>
            </div>

            <Field label="Title" required error={errors.title}>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((p) => ({ ...p, title: '' }));
                }}
                maxLength={50}
                placeholder="e.g., Sigma Chi House Party"
                className={inputClass}
              />
            </Field>

            <Field label="Host" required error={errors.host}>
              <input
                value={host}
                onChange={(e) => {
                  setHost(e.target.value);
                  if (errors.host) setErrors((p) => ({ ...p, host: '' }));
                }}
                maxLength={30}
                placeholder="e.g., Sigma Chi"
                className={inputClass}
              />
            </Field>

            <Field label="Map pin label" required error={errors.pinLabel} hint="Max 5 characters">
              <input
                value={pinLabel}
                onChange={(e) => {
                  setPinLabel(e.target.value);
                  if (errors.pinLabel) setErrors((p) => ({ ...p, pinLabel: '' }));
                }}
                maxLength={5}
                placeholder="e.g., ΣΧ"
                className={inputClass}
              />
            </Field>

            <div className="relative" ref={addressInputRef}>
              <Field label="Address" required error={errors.address}>
                <input
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Start typing address…"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
              {isLoadingSuggestions && (
                <div className="absolute right-4 top-11 text-white/40">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                      type="button"
                      onClick={() => {
                        // Backend already returns Google-style labels — use whole string.
                        setAddress(suggestion.display_name);
                        setCoords({
                          lat: Number(suggestion.lat),
                          lng: Number(suggestion.lon),
                        });
                        setShowSuggestions(false);
                        setAddressSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-white text-sm border-b border-zinc-800 last:border-b-0"
                    >
                      <div className="font-medium">{suggestion.display_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Field label="Night" required error={errors.date}>
              {weekendLoading ? (
                <p className="text-white/40 text-sm font-montserrat">Loading calendar…</p>
              ) : (
                <WeekendCalendarPicker
                  weekends={weekends}
                  todayIso={todayIso}
                  value={date}
                  onChange={(iso, weekendOf) => {
                    setDate(iso);
                    setSelectedWeekendOf(weekendOf);
                    if (errors.date) setErrors((p) => ({ ...p, date: '' }));
                  }}
                  error={errors.date}
                />
              )}
            </Field>

            <Field label="Doors open">
              <select
                value={doorsOpen}
                onChange={(e) => setDoorsOpen(e.target.value)}
                className={inputClass}
              >
                {DOOR_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
            <PrimaryButton disabled={weekendLoading}>Continue</PrimaryButton>
          </form>
        )}

        {step === 'poster' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Poster</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">
                Optional — a flyer helps your listing stand out.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full aspect-[3/4] max-h-80 rounded-xl border border-dashed border-zinc-600 bg-zinc-900/60 flex flex-col items-center justify-center overflow-hidden disabled:opacity-60"
            >
              {posterPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterPreview} alt="Poster preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/50 text-sm font-montserrat px-4 text-center">
                  Tap to upload JPEG, PNG, or WebP
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onPosterFile(e.target.files?.[0] ?? null)}
            />
            {posterPreview && (
              <button
                type="button"
                onClick={clearPoster}
                className="text-sm font-montserrat text-white/50 underline"
              >
                Remove poster
              </button>
            )}
            {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
            <div className="flex gap-3">
              <SecondaryButton onClick={goBack}>Back</SecondaryButton>
              <PrimaryButton onClick={goNext} type="button">
                Continue
              </PrimaryButton>
            </div>
            <button
              type="button"
              onClick={goNext}
              className="w-full text-center text-white/40 text-sm font-montserrat"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 'description' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goNext();
            }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Description</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">
                Optional — what should people know?
              </p>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={5}
              placeholder="BYOB, dress code, theme…"
              className={`${inputClass} resize-none`}
            />
            <p className="text-white/30 text-xs font-montserrat text-right">
              {description.length}/1000
            </p>
            <div className="flex gap-3">
              <SecondaryButton onClick={goBack}>Back</SecondaryButton>
              <PrimaryButton>Continue</PrimaryButton>
            </div>
            <button
              type="button"
              onClick={goNext}
              className="w-full text-center text-white/40 text-sm font-montserrat"
            >
              Skip for now
            </button>
          </form>
        )}

        {step === 'ticket' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitParty();
            }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">Ticket price</h1>
              <p className="text-white/60 text-sm font-montserrat mt-1">
                Optional display text — not a payment link.
              </p>
            </div>
            <input
              value={ticketPrice}
              onChange={(e) => setTicketPrice(e.target.value.slice(0, 50))}
              placeholder="e.g., Free · $10 at door"
              className={inputClass}
              maxLength={50}
            />
            {error && <p className="text-red-400 text-sm font-montserrat">{error}</p>}
            <div className="flex gap-3">
              <SecondaryButton onClick={goBack} disabled={submitting}>
                Back
              </SecondaryButton>
              <PrimaryButton disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </PrimaryButton>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#b24bf3]/20 flex items-center justify-center">
              <span className="text-[#b24bf3] text-2xl">✓</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-montserrat font-semibold">
                Submitted — awaiting approval
              </h1>
              <p className="text-white/60 text-sm font-montserrat mt-2">
                Your party won&apos;t appear on the feed until an admin approves it
                {selectedWeekend
                  ? `, and it stays scheduled until the ${formatWeekendRange(
                      selectedWeekend.fridayDate,
                      selectedWeekend.saturdayDate
                    )} weekend goes live`
                  : ''}
                . Track status under My parties.
              </p>
            </div>
            <PrimaryButton type="button" onClick={() => router.push('/profile')}>
              View my parties
            </PrimaryButton>
            <Link href="/" className="block text-white/40 text-sm font-montserrat">
              Back to home
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const inputClass =
  'w-full px-4 py-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-white/40 font-montserrat focus:border-[#b24bf3] outline-none';

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/50 mb-1.5 font-montserrat">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-white/30 text-xs mt-1 font-montserrat">{hint}</p>}
      {error && <p className="text-red-400 text-sm mt-1 font-montserrat">{error}</p>}
    </div>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
  type = 'submit',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex-1 w-full py-3.5 rounded-xl font-montserrat font-semibold text-white bg-[#b24bf3] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-3.5 rounded-xl font-montserrat font-semibold text-white/70 border border-zinc-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
