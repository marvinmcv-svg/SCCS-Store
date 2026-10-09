import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center animate-fade-up', className)}>
      {icon && <div className="mb-6 grid size-16 place-items-center rounded-full bg-bg-subtle text-ink-2">{icon}</div>}
      <h2 className="t-title max-w-xs">{title}</h2>
      {description && <p className="t-body mt-2 max-w-sm text-ink-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
