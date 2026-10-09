'use client';

import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/admin/ui';
import { ColumnChart, BarList } from '@/components/admin/charts';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Row = { label: string; value: number; sub?: string };

export function ReportCharts({
  series,
  byGrade,
  bySize,
  byMethod,
  labels,
  locale,
}: {
  series: Row[];
  byGrade: Row[];
  bySize: Row[];
  byMethod: Row[];
  labels: Record<'sales' | 'grade' | 'size' | 'method' | 'noData' | 'table' | 'date' | 'revenue', string>;
  locale: string;
}) {
  const dayLabel = (d: string) => formatDate(`${d}T12:00:00-04:00`, locale, { year: undefined, month: 'short', day: 'numeric' });
  const units = (n: number) => String(n);
  return (
    <>
      <Card title={labels.sales} className="mt-6">
        {series.every((d) => d.value === 0) ? (
          <p className="t-caption text-ink-2">{labels.noData}</p>
        ) : (
          <>
            <ColumnChart data={series} format={formatBs} labelFormat={dayLabel} ariaLabel={labels.sales} />
            <details className="mt-4">
              <summary className="t-caption cursor-pointer text-ink-2">{labels.table}</summary>
              <table className="t-caption mt-2 w-full tabular">
                <thead>
                  <tr className="text-left text-ink-2">
                    <th className="py-1">{labels.date}</th>
                    <th className="py-1 text-right">{labels.revenue}</th>
                  </tr>
                </thead>
                <tbody>
                  {series
                    .filter((d) => d.value > 0)
                    .map((d) => (
                      <tr key={d.label} className="border-t border-line">
                        <td className="py-1">{dayLabel(d.label)}</td>
                        <td className="py-1 text-right">{formatBs(d.value)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={labels.grade}>
          <BarList data={byGrade} format={units} empty={labels.noData} />
        </Card>
        <Card title={labels.size}>
          <BarList data={bySize} format={units} empty={labels.noData} />
        </Card>
        <Card title={labels.method}>
          <BarList data={byMethod} format={formatBs} empty={labels.noData} />
        </Card>
      </div>
    </>
  );
}

export function PeriodTabs({ current, labels }: { current: string; labels: Record<string, string> }) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-bg-subtle p-1">
      {Object.entries(labels).map(([k, l]) => (
        <Link
          key={k}
          href={`/admin/reports?p=${k}`}
          role="tab"
          aria-selected={current === k}
          className={cn('pressable inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium', current === k ? 'bg-bg text-ink shadow-1' : 'text-ink-2 hover:text-ink')}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
