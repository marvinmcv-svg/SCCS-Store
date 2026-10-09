'use client';

import * as React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Toggle } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { gradeLabel, sizeLabel } from '@/config/catalog';
import { addBundleToCart } from '@/actions/cart';
import { useStore } from '@/components/store/store-provider';

type Item = {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  blur: string | null;
  qty: number;
  optional: boolean;
  garmentType: string | null;
  allowPreorder: boolean;
  variants: { id: string; size: string; priceCents: number; available: number }[];
};

/**
 * Signature feature: grade kit with per-item size selection. Choosing a
 * student pre-fills every piece with that student's saved sizes.
 */
export function BundleBuilder({ bundleId, discountPct, items }: { bundleId: string; discountPct: number; items: Item[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { students, setCount, user } = useStore();
  const [studentId, setStudentId] = React.useState<string | null>(students[0]?.id ?? null);
  const [include, setInclude] = React.useState<Record<string, boolean>>(() => Object.fromEntries(items.map((i) => [i.productId, !i.optional])));
  const prefill = React.useCallback(
    (sid: string | null) => {
      const s = students.find((x) => x.id === sid);
      return Object.fromEntries(
        items.map((i) => {
          if (i.variants.length === 1) return [i.productId, i.variants[0].id];
          const saved = s && i.garmentType ? s.sizes[i.garmentType]?.size : undefined;
          return [i.productId, i.variants.find((v) => v.size === saved && (v.available >= i.qty || i.allowPreorder))?.id ?? null];
        }),
      ) as Record<string, string | null>;
    },
    [items, students],
  );
  const [sel, setSel] = React.useState<Record<string, string | null>>(() => prefill(studentId));
  const [pending, setPending] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);

  const active = items.filter((i) => include[i.productId]);
  const price = (i: Item) => {
    const v = i.variants.find((x) => x.id === sel[i.productId]);
    return (v?.priceCents ?? Math.min(...i.variants.map((x) => x.priceCents))) * i.qty;
  };
  const subtotal = active.reduce((s, i) => s + price(i), 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  const missing = active.filter((i) => !sel[i.productId]);

  async function add() {
    if (missing.length) {
      setShowErrors(true);
      haptic('error');
      toast.error(t('bundles.missingSizes'));
      return;
    }
    setPending(true);
    const res = await addBundleToCart({ bundleId, studentId, lines: active.map((i) => ({ productId: i.productId, variantId: sel[i.productId]! })) });
    setPending(false);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    setCount(res.data.count);
    haptic('success');
    toast(t('bundles.added'), { action: { label: t('product.viewBag'), onClick: () => router.push('/bag') } });
    router.refresh();
  }

  return (
    <div className="mt-8">
      {user && students.length > 0 && (
        <div className="mb-8">
          <p className="t-label mb-3 text-ink-2">{t('product.whoFor')}</p>
          <div className="flex flex-wrap gap-2">
            {students.map((s) => (
              <Chip
                key={s.id}
                size="sm"
                selected={s.id === studentId}
                onClick={() => {
                  setStudentId(s.id);
                  setSel(prefill(s.id));
                }}
              >
                {s.name} · {gradeLabel(s.grade, locale)}
              </Chip>
            ))}
            <Chip
              size="sm"
              selected={!studentId}
              onClick={() => {
                setStudentId(null);
                setSel(prefill(null));
              }}
            >
              {t('product.whoForNone')}
            </Chip>
          </div>
        </div>
      )}

      <p className="t-label mb-2 text-ink-2">{t('bundles.pickSizes')}</p>
      <ul className="divide-y divide-line border-y border-line">
        {items.map((i) => {
          const on = include[i.productId];
          const err = showErrors && on && !sel[i.productId];
          return (
            <li key={i.productId} className={cn('py-5 transition-opacity', !on && 'opacity-50')}>
              <div className="flex gap-4">
                <Link href={`/p/${i.slug}`} className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-[3px] bg-bg-subtle">
                  {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain p-1" placeholder={i.blur ? 'blur' : 'empty'} blurDataURL={i.blur ?? undefined} />}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="t-body font-medium">
                        {i.qty > 1 && <span className="tabular text-ink-2">{i.qty}× </span>}
                        {i.name}
                      </p>
                      <p className="t-caption tabular text-ink-2">{formatBs(price(i))}</p>
                    </div>
                    {i.optional && (
                      <Toggle aria-label={`${t('bundles.include')} ${i.name}`} checked={on} onCheckedChange={(c) => setInclude((x) => ({ ...x, [i.productId]: c }))} />
                    )}
                  </div>
                  {i.optional && <p className="t-label mt-1 text-ink-3">{t('bundles.optional')}</p>}
                  {on && i.variants.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${t('product.size')} · ${i.name}`}>
                      {i.variants.map((v) => {
                        const out = v.available < i.qty && !i.allowPreorder;
                        const selected = sel[i.productId] === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={out}
                            onClick={() => {
                              haptic();
                              setSel((x) => ({ ...x, [i.productId]: v.id }));
                            }}
                            className={cn(
                              'pressable h-11 min-w-11 rounded-[8px] px-2.5 text-[14px] font-medium ring-1 ring-inset',
                              selected ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink-3',
                              out && 'bg-bg-subtle text-ink-3 line-through ring-transparent',
                              err && 'ring-red',
                            )}
                          >
                            {sizeLabel(v.size, locale)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {err && <p className="t-caption mt-2 text-red">{t('product.selectSizeFirst')}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="t-body mt-6 space-y-2">
        <div className="flex justify-between">
          <dt className="text-ink-2">{t('bag.subtotal')}</dt>
          <dd className="tabular">{formatBs(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-success">
          <dt>{t('bundles.savings')}</dt>
          <dd className="tabular">−{formatBs(discount)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-[17px] font-medium">
          <dt>{t('bundles.total')}</dt>
          <dd className="tabular">{formatBs(subtotal - discount)}</dd>
        </div>
      </dl>

      <Button size="lg" block className="mt-6 hidden md:inline-flex" loading={pending} onClick={add}>
        {t('bundles.addBundle', { price: formatBs(subtotal - discount) })}
      </Button>
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[var(--z-sticky)] border-t border-line bg-bg/92 px-4 py-3 backdrop-blur-xl md:hidden">
        <Button size="lg" block loading={pending} onClick={add}>
          {t('bundles.addBundle', { price: formatBs(subtotal - discount) })}
        </Button>
      </div>
    </div>
  );
}
