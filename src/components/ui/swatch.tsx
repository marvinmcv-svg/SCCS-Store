'use client';

import { cn } from '@/lib/utils';

export function SwatchGroup({
  options,
  value,
  onChange,
  legend,
}: {
  options: { value: string; label: string; hex: string }[];
  value: string;
  onChange: (v: string) => void;
  legend: string;
}) {
  return (
    <fieldset>
      <legend className="t-caption mb-2 text-ink-2">
        {legend}: <span className="text-ink">{options.find((o) => o.value === value)?.label}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'pressable grid size-11 cursor-pointer place-items-center rounded-full ring-1 ring-inset',
              value === o.value ? 'ring-2 ring-ink' : 'ring-transparent hover:ring-line-strong',
            )}
            title={o.label}
          >
            <input
              type="radio"
              className="sr-only"
              name={legend}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              aria-label={o.label}
            />
            <span className="size-8 rounded-full ring-1 ring-black/10 ring-inset" style={{ background: o.hex }} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SwatchDots({ colors, max = 4 }: { colors: string[]; max?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {colors.slice(0, max).map((c) => (
        <span key={c} className="size-2.5 rounded-full ring-1 ring-black/10 ring-inset" style={{ background: c }} />
      ))}
    </span>
  );
}
