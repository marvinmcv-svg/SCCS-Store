import * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-bg text-ink',
  subtle: 'bg-bg-subtle text-ink-2',
  accent: 'bg-accent text-accent-ink',
  accentSoft: 'bg-accent-soft text-accent',
  red: 'bg-red-soft text-red',
  gold: 'bg-gold text-[#14142b]',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  outline: 'ring-1 ring-inset ring-line-strong text-ink-2',
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('t-label inline-flex h-6 items-center gap-1 rounded-[3px] px-2 whitespace-nowrap', tones[tone], className)}
      {...props}
    />
  );
}
