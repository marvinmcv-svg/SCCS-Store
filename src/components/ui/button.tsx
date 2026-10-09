'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

export const buttonVariants = cva(
  'pressable relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] outline-none disabled:opacity-40 aria-disabled:opacity-40 aria-disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:opacity-90',
        secondary: 'bg-bg text-ink ring-1 ring-inset ring-line-strong hover:ring-ink',
        subtle: 'bg-bg-subtle text-ink hover:bg-bg-muted',
        ghost: 'bg-transparent text-ink hover:bg-bg-subtle',
        inverse: 'bg-white text-[#14142b] hover:bg-white/90',
        outlineInverse: 'bg-transparent text-white ring-1 ring-inset ring-white/70 hover:bg-white/10',
        danger: 'bg-red text-white hover:opacity-90',
        link: 'h-auto rounded-none px-0 text-ink underline underline-offset-4 decoration-1 hover:decoration-2',
      },
      size: {
        sm: 'h-9 px-4 text-[13px]',
        md: 'h-11 px-5 text-[15px]',
        lg: 'h-[52px] px-7 text-[15px]',
      },
      block: { true: 'w-full' },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, disabled, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-pulse rounded-full bg-current"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        </span>
      )}
    </button>
  );
});

type ButtonLinkProps = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
