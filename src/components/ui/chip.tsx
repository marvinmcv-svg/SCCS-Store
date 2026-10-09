'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Chip = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; size?: 'sm' | 'md' }
>(function Chip({ selected, size = 'md', className, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'pressable inline-flex shrink-0 items-center gap-2 rounded-full whitespace-nowrap ring-1 ring-inset',
        size === 'md' ? 'h-11 px-5 text-[15px]' : 'h-9 px-4 text-[13px]',
        selected ? 'bg-ink text-bg ring-ink' : 'bg-bg text-ink ring-line-strong hover:ring-ink',
        className,
      )}
      {...props}
    />
  );
});
