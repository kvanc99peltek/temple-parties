'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export type WeekendOption = {
  weekendOf: string;
  fridayDate: string;
  saturdayDate: string;
};

type WeekendCalendarPickerProps = {
  weekends: WeekendOption[];
  todayIso: string;
  value: string;
  onChange: (dateIso: string, weekendOf: string) => void;
  disabled?: boolean;
  error?: string;
};

/** Parse YYYY-MM-DD as local noon (avoids UTC off-by-one). */
function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
}

function formatTriggerLabel(iso: string): string {
  if (!iso) return 'Pick a night';
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return 'Pick a night';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Mini calendar dropdown for create-party: only creatable Fri/Sat nights.
 * Weekend pairs get a shared highlight; Mon–Thu / past days stay muted.
 */
export default function WeekendCalendarPicker({
  weekends,
  todayIso,
  value,
  onChange,
  disabled,
  error,
}: WeekendCalendarPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectable = useMemo(() => {
    const map = new Map<string, string>(); // dateIso → weekendOf
    for (const w of weekends) {
      if (!todayIso || w.fridayDate >= todayIso) map.set(w.fridayDate, w.weekendOf);
      if (!todayIso || w.saturdayDate >= todayIso) map.set(w.saturdayDate, w.weekendOf);
    }
    return map;
  }, [weekends, todayIso]);

  const weekendPair = useMemo(() => {
    const pairs = new Map<string, { fri: string; sat: string }>();
    for (const w of weekends) {
      pairs.set(w.fridayDate, { fri: w.fridayDate, sat: w.saturdayDate });
      pairs.set(w.saturdayDate, { fri: w.fridayDate, sat: w.saturdayDate });
    }
    return pairs;
  }, [weekends]);

  const minMonth = useMemo(() => {
    const keys = Array.from(selectable.keys()).sort();
    const first = keys[0];
    return first ? startOfMonth(parseISODate(first)) : startOfMonth(new Date());
  }, [selectable]);

  const maxMonth = useMemo(() => {
    const keys = Array.from(selectable.keys()).sort();
    const last = keys[keys.length - 1];
    return last ? startOfMonth(parseISODate(last)) : minMonth;
  }, [selectable, minMonth]);

  const [viewMonth, setViewMonth] = useState(() =>
    value ? startOfMonth(parseISODate(value)) : minMonth
  );

  useEffect(() => {
    if (value) setViewMonth(startOfMonth(parseISODate(value)));
    else setViewMonth(minMonth);
  }, [value, minMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const canPrev = viewMonth > minMonth;
  const canNext = viewMonth < maxMonth;

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    // Grid starts on Sunday
    const startPad = first.getDay(); // 0=Sun
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cellsOut: Array<{
      iso: string | null;
      dayNum: number | null;
      inMonth: boolean;
    }> = [];

    for (let i = 0; i < startPad; i++) {
      cellsOut.push({ iso: null, dayNum: null, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(first.getFullYear(), first.getMonth(), day, 12);
      cellsOut.push({ iso: toISODate(d), dayNum: day, inMonth: true });
    }
    while (cellsOut.length % 7 !== 0) {
      cellsOut.push({ iso: null, dayNum: null, inMonth: false });
    }
    return cellsOut;
  }, [viewMonth]);

  const monthTitle = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const selectedPair = value ? weekendPair.get(value) : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || selectable.size === 0}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border font-montserrat text-left transition-colors disabled:opacity-50 ${
          error
            ? 'border-red-500/60 bg-zinc-900 text-white'
            : open
              ? 'border-[#b24bf3] bg-zinc-900 text-white'
              : 'border-zinc-700 bg-zinc-900 text-white hover:border-zinc-500'
        }`}
      >
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="text-white font-medium truncate">{formatTriggerLabel(value)}</span>
          {selectedPair && (
            <span className="text-white/40 text-xs truncate">
              Weekend of{' '}
              {parseISODate(selectedPair.fri).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose party night"
          className="absolute z-50 mt-2 w-full min-w-[280px] rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50 p-3"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => canPrev && setViewMonth(addMonths(viewMonth, -1))}
              className="w-8 h-8 rounded-lg text-white/70 hover:bg-zinc-800 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent font-montserrat"
              aria-label="Previous month"
            >
              ‹
            </button>
            <p className="text-white text-sm font-montserrat font-semibold">{monthTitle}</p>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => canNext && setViewMonth(addMonths(viewMonth, 1))}
              className="w-8 h-8 rounded-lg text-white/70 hover:bg-zinc-800 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent font-montserrat"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div
                key={d}
                className={`text-center text-[10px] font-montserrat font-semibold tracking-wide py-1 ${
                  d === 'Fr' || d === 'Sa' ? 'text-[#b24bf3]/80' : 'text-white/30'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, idx) => {
              if (!cell.inMonth || !cell.iso) {
                return <div key={`pad-${idx}`} className="h-9" />;
              }

              const weekendOf = selectable.get(cell.iso);
              const isSelectable = !!weekendOf;
              const isSelected = cell.iso === value;
              const pair = weekendPair.get(cell.iso);
              const inSelectedWeekend =
                !!selectedPair &&
                (cell.iso === selectedPair.fri || cell.iso === selectedPair.sat);
              const isFri = pair && cell.iso === pair.fri;
              const isSat = pair && cell.iso === pair.sat;
              const isToday = cell.iso === todayIso;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!isSelectable}
                  onClick={() => {
                    if (!weekendOf) return;
                    onChange(cell.iso!, weekendOf);
                    setOpen(false);
                  }}
                  className={[
                    'relative h-9 w-full flex items-center justify-center text-sm font-montserrat transition-colors',
                    isSelectable ? 'cursor-pointer' : 'cursor-default',
                    // Soft weekend-pair rail behind Fri/Sat of the selected weekend
                    inSelectedWeekend && isFri ? 'rounded-l-full bg-[#b24bf3]/15' : '',
                    inSelectedWeekend && isSat ? 'rounded-r-full bg-[#b24bf3]/15' : '',
                    isSelectable && !isSelected
                      ? 'text-white hover:bg-[#b24bf3]/20 rounded-full'
                      : '',
                    !isSelectable ? 'text-white/20' : '',
                    isSelected
                      ? 'bg-[#b24bf3] text-white font-semibold rounded-full shadow-md shadow-[#b24bf3]/30'
                      : '',
                    isToday && !isSelected ? 'ring-1 ring-inset ring-white/25 rounded-full' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {cell.dayNum}
                </button>
              );
            })}
          </div>

          <p className="mt-3 px-1 text-[11px] text-white/35 font-montserrat leading-snug">
            Fri &amp; Sat only · future weekends stay hidden until that weekend goes live
          </p>
        </div>
      )}
    </div>
  );
}

/** Exported for create success copy */
export function formatWeekendRange(fridayIso: string, saturdayIso: string): string {
  const fri = parseISODate(fridayIso);
  const sat = parseISODate(saturdayIso);
  if (Number.isNaN(fri.getTime()) || Number.isNaN(sat.getTime())) {
    return `${fridayIso} – ${saturdayIso}`;
  }
  const friLabel = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const satLabel = sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${friLabel} – ${satLabel}`;
}
