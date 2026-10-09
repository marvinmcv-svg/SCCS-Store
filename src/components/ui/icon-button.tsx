'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: 'ghost' | 'subtle' | 'solid' | 'glass';
  size?: 'sm' | 'md';
};

/** 44×44 minimum touch target; `label` is required for screen readers. */
export const IconButton = React.forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'pressable inline-grid shrink-0 place-items-center rounded-full text-ink disabled:opacity-40',
        size === 'md' ? 'size-11' : 'size-9',
        variant === 'ghost' && 'hover:bg-bg-subtle',
        variant === 'subtle' && 'bg-bg-subtle hover:bg-bg-muted',
        variant === 'solid' && 'bg-accent text-accent-ink',
        variant === 'glass' && 'bg-bg/80 backdrop-blur-md shadow-1 hover:bg-bg',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
