'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Filter = { name: string; label: string; options: { value: string; label: string }[] };

/** URL-driven filters: search box + selects (debounced). */
export function FilterBar({ searchPlaceholder, filters = [], children }: { searchPlaceholder?: string; filters?: Filter[]; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get('q') ?? '');
  const [, start] = React.useTransition();

  const set = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete('page');
      start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [sp, pathname, router],
  );

  React.useEffect(() => {
    if ((sp.get('q') ?? '') === q) return;
    const id = setTimeout(() => set({ q }), 300);
    return () => clearTimeout(id);
  }, [q, sp, set]);

  const field = 'h-10 rounded-full bg-bg-subtle px-4 text-[14px] outline-none ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-accent';
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {searchPlaceholder && (
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className={cn(field, 'min-w-0 flex-1 basis-60')} />
      )}
      {filters.map((f) => (
        <select key={f.name} aria-label={f.label} value={sp.get(f.name) ?? ''} onChange={(e) => set({ [f.name]: e.target.value })} className={cn(field, 'appearance-none pr-8')}>
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {children}
    </div>
  );
}

export function Pagination({ page, pages, label }: { page: number; pages: number; label: string }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const n = new URLSearchParams(sp.toString());
    n.set('page', String(p));
    return `${pathname}?${n.toString()}`;
  };
  const btn = 'pressable inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset ring-line-strong hover:ring-ink aria-disabled:pointer-events-none aria-disabled:opacity-40';
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="pagination">
      <a href={href(page - 1)} aria-disabled={page <= 1} className={btn}>
        ←
      </a>
      <span className="t-caption text-ink-2">{label}</span>
      <a href={href(page + 1)} aria-disabled={page >= pages} className={btn}>
        →
      </a>
    </nav>
  );
}
