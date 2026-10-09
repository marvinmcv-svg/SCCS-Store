'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

export type SizeOption = {
  size: string;
  label?: string;
  /** Units available to sell right now (stock minus active holds). */
  available: number;
  /** Out of stock but can be pre-ordered. */
  preorder?: boolean;
  /** Saved size for the selected student. */
  saved?: boolean;
};

/**
 * Large-target size grid (radio group semantics).
 * Sold-out sizes are struck through and stay focusable so screen readers
 * announce them; low stock shows "Only N left".
 */
export function SizeGrid({
  options,
  value,
  onChange,
  name,
  legend,
  lowStockLabel,
  soldOutLabel,
  preorderLabel,
  savedLabel,
  lowStockThreshold = 3,
  allowSoldOut = false,
}: {
  options: SizeOption[];
  value: string | null;
  onChange: (size: string) => void;
  name: string;
  legend: string;
  lowStockLabel: (n: number) => string;
  soldOutLabel: string;
  preorderLabel: string;
  savedLabel: string;
  lowStockThreshold?: number;
  allowSoldOut?: boolean;
}) {
  const selected = options.find((o) => o.size === value);
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {options.map((o) => {
          const soldOut = o.available <= 0 && !o.preorder;
          const isSelected = value === o.size;
          return (
            <label
              key={o.size}
              className={cn(
                'pressable relative grid h-14 cursor-pointer place-items-center rounded-[8px] text-[15px] font-medium ring-1 ring-inset transition-[box-shadow,background-color]',
                isSelected ? 'bg-bg ring-2 ring-ink' : 'bg-bg ring-line hover:ring-ink-3',
                soldOut && 'cursor-not-allowed bg-bg-subtle text-ink-3 ring-transparent hover:ring-transparent',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.size}
                checked={isSelected}
                disabled={soldOut && !allowSoldOut}
                aria-label={`${o.label ?? o.size}${soldOut ? ` · ${soldOutLabel}` : o.preorder && o.available <= 0 ? ` · ${preorderLabel}` : ''}`}
                onChange={() => {
                  haptic();
                  onChange(o.size);
                }}
                className="sr-only"
              />
              <span className={cn(soldOut && 'line-through decoration-1')}>{o.label ?? o.size}</span>
              {o.saved && (
                <span className="absolute top-1 right-1 size-1.5 rounded-full bg-accent" title={savedLabel} aria-hidden />
              )}
              {o.preorder && o.available <= 0 && (
                <span className="t-label absolute bottom-1 text-[9px] text-ink-2">{preorderLabel}</span>
              )}
            </label>
          );
        })}
      </div>
      <p className="t-caption mt-3 min-h-5" aria-live="polite">
        {selected && selected.available > 0 && selected.available <= lowStockThreshold && (
          <span className="text-red">{lowStockLabel(selected.available)}</span>
        )}
        {selected?.saved && <span className="ml-2 text-ink-2">· {savedLabel}</span>}
      </p>
    </fieldset>
  );
}
