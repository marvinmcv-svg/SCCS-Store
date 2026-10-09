'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getBag } from '@/actions/cart';
import type { CartView } from '@/lib/cart';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BagIcon } from '@/components/ui/icons';
import { formatBs } from '@/lib/money';
import { BagLines } from '@/components/store/bag/bag-lines';
import { BagSummary } from '@/components/store/bag/bag-summary';

export function BagScreen({ initial, location }: { initial: CartView; location: string }) {
  const t = useTranslations('bag');
  const locale = useLocale();
  const [view, setView] = React.useState(initial);
  const refresh = React.useCallback(async () => {
    const res = await getBag(locale);
    if (res.ok) setView(res.data);
  }, [locale]);

  const empty = view.lines.length === 0;
  const blocked = view.lines.some((l) => l.insufficient);

  return (
    <div className="container-page pt-6 pb-40 md:pt-12 md:pb-0">
      <h1 className="t-h1">{t('title')}</h1>
      {!empty && <p className="t-caption mt-2 text-ink-2 md:hidden">{t('swipeHint')}</p>}
      {empty && view.saved.length === 0 ? (
        <EmptyState icon={<BagIcon className="size-7" />} title={t('empty')} description={t('emptyBody')} action={<ButtonLink href="/shop">{t('startShopping')}</ButtonLink>} />
      ) : (
        <div className="mt-6 grid gap-10 md:grid-cols-[1fr_380px] md:gap-16">
          <div>
            {empty ? <p className="t-body py-8 text-ink-2">{t('empty')}</p> : null}
            <BagLines view={view} refresh={refresh} />
          </div>
          {!empty && (
            <aside className="md:sticky md:top-24 md:self-start">
              <div className="space-y-6">
                <h2 className="t-title hidden md:block">{t('summary')}</h2>
                <BagSummary view={view} refresh={refresh} />
                <div className="flex gap-3 rounded-[12px] bg-bg-subtle p-4">
                  <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M4 10h16M6 10V6h12v4M5 10v10h14V10M10 20v-5h4v5" />
                  </svg>
                  <div>
                    <p className="t-body font-medium">{t('pickupTitle')}</p>
                    <p className="t-caption text-ink-2">
                      {location}. {t('pickupBody')}
                    </p>
                  </div>
                </div>
                <ButtonLink href="/checkout" size="lg" block className="hidden md:inline-flex" aria-disabled={blocked}>
                  {t('checkout')}
                </ButtonLink>
              </div>
            </aside>
          )}
        </div>
      )}
      {!empty && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[var(--z-sticky)] border-t border-line bg-bg/92 px-4 py-3 backdrop-blur-xl md:hidden">
          <ButtonLink href="/checkout" size="lg" block aria-disabled={blocked}>
            {t('checkout')} · <span className="tabular">{formatBs(view.pricing.totalCents)}</span>
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
