'use client';

import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  decreaseLabel = '−1',
  increaseLabel = '+1',
  className,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const btn =
    'pressable grid size-10 place-items-center rounded-full text-ink hover:bg-bg-muted disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex h-10 items-center rounded-full bg-bg-subtle', className)}
    >
      <button
        type="button"
        className={btn}
        aria-label={decreaseLabel}
        disabled={disabled || value <= min}
        onClick={() => {
          haptic();
          onChange(Math.max(min, value - 1));
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 12h14" />
        </svg>
      </button>
      <output className="tabular w-7 text-center text-[15px] font-medium" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={btn}
        aria-label={increaseLabel}
        disabled={disabled || value >= max}
        onClick={() => {
          haptic();
          onChange(Math.min(max, value + 1));
        }}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
