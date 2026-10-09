'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Toggle } from '@/components/ui/toggle';
import { countProducts } from '@/actions/catalog';
import { DIVISIONS, KID_SIZES, ADULT_SIZES } from '@/config/catalog';
import { cn } from '@/lib/utils';

type Params = Record<string, string>;

const SORTS = [
  { v: 'featured', k: 'sortFeatured' },
  { v: 'new', k: 'sortNew' },
  { v: 'price-asc', k: 'sortPriceAsc' },
  { v: 'price-desc', k: 'sortPriceDesc' },
] as const;

const PRICE_STEPS = [100, 150, 250, 400];

function toggleInList(value: string | undefined, item: string) {
  const set = new Set((value ?? '').split(',').filter(Boolean));
  if (set.has(item)) set.delete(item);
  else set.add(item);
  return [...set].join(',');
}

/** Sticky Filter / Sort bar. Both open draggable bottom sheets. */
export function ShopToolbar({ total, category }: { total: number; category?: string }) {
  const t = useTranslations('shop');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = React.useMemo(() => Object.fromEntries(sp.entries()) as Params, [sp]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Params>(current);
  const [count, setCount] = React.useState(total);
  const [, startTransition] = React.useTransition();

  const activeCount = ['grade', 'fit', 'size', 'stock', 'max'].filter((k) => current[k]).length;

  const push = (p: Params) => {
    const clean = Object.fromEntries(Object.entries(p).filter(([k, v]) => v && k !== 'page'));
    startTransition(() => router.replace({ pathname, query: clean }, { scroll: false }));
  };

  const update = (patch: Params) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    countProducts(
      Object.fromEntries(Object.entries(next).filter(([, v]) => v)),
      category,
    ).then(setCount);
  };

  const divisionValue = (grades: string[]) => grades.join(',');
  const gradeSel = (draft.grade ?? '').split(',').filter(Boolean);

  return (
    <>
      <div className="sticky top-14 z-[var(--z-sticky)] border-b border-line bg-bg/90 backdrop-blur-xl md:top-16">
        <div className="container-page flex h-14 items-center justify-between gap-3">
          <p className="t-caption text-ink-2" aria-live="polite">
            {t('results', { count: total })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(current);
                setCount(total);
                setFiltersOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="10" cy="17" r="2" />
              </svg>
              {t('filter')}
              {activeCount > 0 && <span className="tabular grid size-5 place-items-center rounded-full bg-accent text-[11px] text-accent-ink">{activeCount}</span>}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSortOpen(true)}>
              {t('sort')}
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={sortOpen}
        onOpenChange={setSortOpen}
        title={t('sort')}
      >
        <ul role="radiogroup" aria-label={t('sort')} className="-mx-2">
          {SORTS.map((s) => {
            const selected = (current.sort ?? 'featured') === s.v;
            return (
              <li key={s.v}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    push({ ...current, sort: s.v === 'featured' ? '' : s.v });
                    setSortOpen(false);
                  }}
                  className="pressable flex min-h-13 w-full items-center justify-between rounded-[10px] px-3 py-3.5 text-left t-body hover:bg-bg-subtle"
                >
                  {t(s.k)}
                  {selected && (
                    <svg viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title={t('filters')}
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                const keep = { sort: draft.sort ?? '', q: draft.q ?? '' };
                setDraft(keep);
                update({ grade: '', fit: '', size: '', stock: '', max: '' });
              }}
            >
              {t('clearAll')}
            </Button>
            <Button
              size="lg"
              block
              onClick={() => {
                push(draft);
                setFiltersOpen(false);
              }}
            >
              {t('apply', { count })}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 pb-4">
          <fieldset>
            <legend className="t-label mb-3 text-ink-2">{t('grade')}</legend>
            <div className="flex flex-wrap gap-2">
              {DIVISIONS.map((d) => {
                const v = divisionValue(d.grades);
                const selected = d.grades.every((g) => gradeSel.includes(g));
                return (
                  <Chip
                    key={d.id}
                    size="sm"
                    selected={selected}
                    onClick={() => {
                      const set = new Set(gradeSel);
                      if (selected) d.grades.forEach((g) => set.delete(g));
                      else v.split(',').forEach((g) => set.add(g));
                      update({ grade: [...set].join(',') });
                    }}
                  >
                    {locale === 'en' ? d.en : d.es}
                  </Chip>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="t-label mb-3 text-ink-2">{t('fit')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['UNISEX', 'BOYS', 'GIRLS'] as const).map((f) => (
                <Chip key={f} size="sm" selected={(draft.fit ?? '').split(',').includes(f)} onClick={() => update({ fit: toggleInList(draft.fit, f) })}>
                  {t(`fit${f}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="t-label mb-3 text-ink-2">{t('size')}</legend>
            <div className="grid grid-cols-6 gap-2">
              {[...KID_SIZES, ...ADULT_SIZES].map((s) => {
                const on = (draft.size ?? '').split(',').includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => update({ size: toggleInList(draft.size, s) })}
                    className={cn('pressable h-11 rounded-[8px] text-[14px] font-medium ring-1 ring-inset', on ? 'bg-ink text-bg ring-ink' : 'ring-line hover:ring-ink-3')}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="t-label mb-3 text-ink-2">{t('price')}</legend>
            <div className="flex flex-wrap gap-2">
              {PRICE_STEPS.map((p) => (
                <Chip key={p} size="sm" selected={draft.max === String(p)} onClick={() => update({ max: draft.max === String(p) ? '' : String(p) })}>
                  {t('priceMax', { price: `Bs ${p}` })}
                </Chip>
              ))}
            </div>
          </fieldset>
          <Toggle label={t('inStockOnly')} checked={draft.stock === '1'} onCheckedChange={(c) => update({ stock: c ? '1' : '' })} />
        </div>
      </BottomSheet>
    </>
  );
}
