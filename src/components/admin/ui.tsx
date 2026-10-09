import * as React from 'react';
import type { OrderStatus, PaymentStatus } from '@prisma/client';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="mb-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h2">{title}</h1>
          {description && <p className="t-body mt-1.5 max-w-2xl text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ className, children, title, actions }: { className?: string; children: React.ReactNode; title?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn('rounded-[14px] bg-bg-subtle p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="t-title">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'warning' | 'success' | 'red' }) {
  return (
    <div className="rounded-[14px] bg-bg-subtle p-5">
      <p className="t-label text-ink-2">{label}</p>
      <p className={cn('tabular mt-2 text-[28px] leading-none font-medium tracking-[-0.03em]', tone === 'warning' && 'text-warning', tone === 'red' && 'text-red', tone === 'success' && 'text-success')}>{value}</p>
      {hint && <p className="t-caption mt-2 text-ink-2">{hint}</p>}
    </div>
  );
}

/** Responsive table: scrolls horizontally on phones. */
export function Table({ children, className, compact }: { children: React.ReactNode; className?: string; compact?: boolean }) {
  return (
    <div className={cn('-mx-4 overflow-x-auto md:mx-0', className)}>
      <table className={cn('t-body w-full border-collapse', compact ? 'min-w-0' : 'min-w-[640px]')}>{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('t-label border-b border-line px-4 py-3 text-left font-medium whitespace-nowrap text-ink-2 first:pl-4 md:first:pl-0', className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle first:pl-4 md:first:pl-0', className)}>{children}</td>;
}

export const ORDER_TONE: Record<OrderStatus, BadgeTone> = {
  RECEIVED: 'warning',
  PAYMENT_VERIFIED: 'accentSoft',
  PREPARING: 'accentSoft',
  READY: 'success',
  PICKED_UP: 'subtle',
  CANCELLED: 'red',
  EXPIRED: 'red',
};
export const PAY_TONE: Record<PaymentStatus, BadgeTone> = { PENDING: 'outline', SUBMITTED: 'warning', VERIFIED: 'success', REJECTED: 'red', REFUNDED: 'subtle' };

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="t-title">{title}</p>
      {body && <p className="t-caption mt-1 text-ink-2">{body}</p>}
    </div>
  );
}
