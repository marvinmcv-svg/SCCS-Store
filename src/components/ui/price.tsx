import { formatBs } from '@/lib/money';
import { cn } from '@/lib/utils';

export function Price({
  cents,
  compareAt,
  className,
  from,
  fromLabel = 'Desde',
}: {
  cents: number;
  compareAt?: number | null;
  className?: string;
  from?: boolean;
  fromLabel?: string;
}) {
  const discounted = compareAt && compareAt > cents;
  return (
    <span className={cn('tabular inline-flex items-baseline gap-2', className)}>
      {from && <span className="text-ink-2">{fromLabel}</span>}
      <span className={cn(discounted && 'text-red')}>{formatBs(cents)}</span>
      {discounted && <s className="text-ink-3">{formatBs(compareAt!)}</s>}
    </span>
  );
}
