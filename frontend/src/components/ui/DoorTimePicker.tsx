'use client';

/**
 * Free-form doors-open picker: any hour, any minute, AM/PM.
 * Replaces the old 9/10/11/12 PM-only select so daytime events (darts, etc.) work.
 */
import {
  formatDoorTimeParts,
  parseDoorTimeParts,
  type DoorTimePeriod,
} from '@/utils/dateHelpers';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: DoorTimePeriod[] = ['AM', 'PM'];

const DEFAULT_PARTS = { hour: 10, minute: 0, period: 'PM' as DoorTimePeriod };

type Props = {
  value: string;
  onChange: (doorsOpen: string) => void;
  selectClassName: string;
  id?: string;
};

export default function DoorTimePicker({ value, onChange, selectClassName, id }: Props) {
  const parts = parseDoorTimeParts(value) ?? DEFAULT_PARTS;

  const update = (next: Partial<typeof parts>) => {
    onChange(formatDoorTimeParts({ ...parts, ...next }));
  };

  return (
    <div className="flex gap-2" role="group" aria-label="Doors open time">
      <select
        id={id}
        aria-label="Hour"
        value={parts.hour}
        onChange={(e) => update({ hour: parseInt(e.target.value, 10) })}
        className={selectClassName}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        aria-label="Minute"
        value={parts.minute}
        onChange={(e) => update({ minute: parseInt(e.target.value, 10) })}
        className={selectClassName}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        value={parts.period}
        onChange={(e) => update({ period: e.target.value as DoorTimePeriod })}
        className={selectClassName}
      >
        {PERIODS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
