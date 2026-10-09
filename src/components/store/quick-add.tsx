'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SizeGrid } from '@/components/ui/size-grid';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { sizeLabel } from '@/config/catalog';
import { createStockAlert } from '@/actions/favorites';
import { useStore } from './store-provider';

export type QuickAddVariant = { id: string; size: string; available: number };

/** Favorites quick add: pick a size in a sheet, or set a back-in-stock alert. */
export function QuickAdd({ productId, name, variants, allowPreorder }: { productId: string; name: string; variants: QuickAddVariant[]; allowPreorder: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { addToCart } = useStore();
  const [open, setOpen] = React.useState(false);
  const [size, setSize] = React.useState<string | null>(variants.length === 1 ? variants[0].size : null);
  const [email, setEmail] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const soldOut = variants.every((v) => v.available <= 0) && !allowPreorder;
  const selected = variants.find((v) => v.size === size);

  return (
    <>
      <Button size="sm" variant={soldOut ? 'secondary' : 'primary'} block onClick={() => setOpen(true)}>
        {soldOut ? t('favorites.backInStock') : t('favorites.quickAdd')}
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={name} description={soldOut ? t('favorites.soldOut') : t('favorites.chooseSize')}>
        {soldOut ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              const res = await createStockAlert({ productId, email, locale: locale as 'es' | 'en' });
              setPending(false);
              if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
              toast(t('favorites.alertOn'));
              setOpen(false);
            }}
          >
            <Field label={t('product.notifyEmail')} htmlFor={`alert-${productId}`}>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" block loading={pending}>
              {t('product.notifyMe')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {variants.length > 1 && (
              <SizeGrid
                name={`qa-${productId}`}
                legend={t('product.size')}
                value={size}
                onChange={setSize}
                lowStockLabel={(n) => t('product.onlyLeft', { count: n })}
                soldOutLabel={t('product.soldOut')}
                preorderLabel={t('product.preorder')}
                savedLabel={t('product.savedSize')}
                options={variants.map((v) => ({ size: v.size, label: sizeLabel(v.size, locale), available: v.available, preorder: allowPreorder }))}
              />
            )}
            <Button
              size="lg"
              block
              disabled={!selected}
              loading={pending}
              onClick={async () => {
                if (!selected) return;
                setPending(true);
                const ok = await addToCart({ variantId: selected.id });
                setPending(false);
                if (ok) setOpen(false);
              }}
            >
              {t('product.addToBag')}
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
