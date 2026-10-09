'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { applyPromo, removePromo } from '@/actions/cart';
import type { CartView } from '@/lib/cart';

export function BagSummary({ view, refresh, showPromo = true }: { view: CartView; refresh: () => Promise<void> | void; showPromo?: boolean }) {
  const t = useTranslations();
  const [code, setCode] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const p = view.pricing;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    const res = await applyPromo(code);
    setPending(false);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    toast(t('bag.promoApplied', { code: res.data.code }));
    setCode('');
    await refresh();
  }

  return (
    <div className="space-y-4">
      {showPromo &&
        (view.promoCode ? (
          <div className="flex items-center justify-between rounded-[10px] bg-success-soft px-4 py-3">
            <span className="t-caption font-medium text-success">{t('bag.promoApplied', { code: view.promoCode })}</span>
            <button
              type="button"
              className="t-caption text-ink-2 underline underline-offset-4"
              onClick={async () => {
                await removePromo();
                await refresh();
              }}
            >
              {t('bag.promoRemove')}
            </button>
          </div>
        ) : (
          <form onSubmit={apply} className="flex gap-2">
            <label htmlFor="promo" className="sr-only">
              {t('bag.promo')}
            </label>
            <Input id="promo" value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('bag.promoPlaceholder')} autoCapitalize="characters" className="h-11 uppercase placeholder:normal-case" />
            <Button type="submit" variant="secondary" loading={pending}>
              {t('bag.promoApply')}
            </Button>
          </form>
        ))}
      <dl className="t-body space-y-2">
        <div className="flex justify-between">
          <dt className="text-ink-2">{t('bag.subtotal')}</dt>
          <dd className="tabular">{formatBs(p.subtotalCents)}</dd>
        </div>
        {p.bundleDiscountCents > 0 && (
          <div className="flex justify-between text-success">
            <dt>{t('bag.bundleDiscount')}</dt>
            <dd className="tabular">−{formatBs(p.bundleDiscountCents)}</dd>
          </div>
        )}
        {p.promoDiscountCents > 0 && (
          <div className="flex justify-between text-success">
            <dt>{t('bag.promoDiscount')}</dt>
            <dd className="tabular">−{formatBs(p.promoDiscountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-3 text-[17px] font-medium">
          <dt>{t('bag.total')}</dt>
          <dd className="tabular">{formatBs(p.totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
