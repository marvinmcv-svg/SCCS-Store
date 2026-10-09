'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SideDrawer } from '@/components/ui/drawer';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RowSkeleton } from '@/components/ui/skeleton';
import { BagIcon } from '@/components/ui/icons';
import { getBag } from '@/actions/cart';
import type { CartView } from '@/lib/cart';
import { useStore } from './store-provider';
import { BagLines } from './bag/bag-lines';
import { BagSummary } from './bag/bag-summary';

/** Desktop bag drawer; fetches the bag on open (skeleton while loading). */
export function BagDrawer() {
  const t = useTranslations('bag');
  const locale = useLocale();
  const { bagOpen, setBagOpen, count } = useStore();
  const [view, setView] = React.useState<CartView | null>(null);

  const refresh = React.useCallback(async () => {
    const res = await getBag(locale);
    if (res.ok) setView(res.data);
  }, [locale]);

  React.useEffect(() => {
    if (!bagOpen) return;
    let alive = true;
    getBag(locale).then((res) => {
      if (alive && res.ok) setView(res.data);
    });
    return () => {
      alive = false;
    };
  }, [bagOpen, locale, count]);

  const empty = view && view.lines.length === 0 && view.saved.length === 0;
  return (
    <SideDrawer
      open={bagOpen}
      onOpenChange={setBagOpen}
      title={t('title')}
      footer={
        view && view.lines.length > 0 ? (
          <div className="space-y-4">
            <BagSummary view={view} refresh={refresh} showPromo={false} />
            <ButtonLink href="/checkout" size="lg" block onClick={() => setBagOpen(false)}>
              {t('checkout')}
            </ButtonLink>
            <ButtonLink href="/bag" variant="secondary" size="lg" block onClick={() => setBagOpen(false)}>
              {t('title')}
            </ButtonLink>
          </div>
        ) : undefined
      }
    >
      {!view ? (
        <RowSkeleton rows={3} />
      ) : empty ? (
        <EmptyState
          icon={<BagIcon className="size-7" />}
          title={t('empty')}
          description={t('emptyBody')}
          action={
            <ButtonLink href="/shop" onClick={() => setBagOpen(false)}>
              {t('startShopping')}
            </ButtonLink>
          }
        />
      ) : (
        <BagLines view={view} refresh={refresh} compact />
      )}
    </SideDrawer>
  );
}
