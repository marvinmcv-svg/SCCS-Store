'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'motion/react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { sizeLabel } from '@/config/catalog';
import type { CartLineView, CartView } from '@/lib/cart';
import { assignCartStudent, removeCartItem, restoreCartItem, toggleSaveForLater, updateCartQty } from '@/actions/cart';
import { useStore } from '../store-provider';

type Props = { view: CartView; refresh: () => Promise<void> | void; compact?: boolean };

/** Bag lines grouped by student, shared by the /bag page and desktop drawer. */
export function BagLines({ view, refresh, compact }: Props) {
  const t = useTranslations('bag');
  const { students } = useStore();
  const groups = React.useMemo(() => {
    const m = new Map<string, { key: string; title: string; lines: CartLineView[] }>();
    for (const l of view.lines) {
      const key = l.studentId ?? '_';
      if (!m.has(key)) m.set(key, { key, title: l.studentName ? t('forStudent', { name: l.studentName }) : t('general'), lines: [] });
      m.get(key)!.lines.push(l);
    }
    return [...m.values()].sort((a, b) => (a.key === '_' ? 1 : b.key === '_' ? -1 : 0));
  }, [view.lines, t]);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.title}>
          {(groups.length > 1 || g.key !== '_') && <h3 className="t-label mb-3 text-ink-2">{g.title}</h3>}
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {g.lines.map((l) => (
                <BagLine key={l.id} line={l} refresh={refresh} students={students} compact={compact} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
      {view.saved.length > 0 && (
        <section aria-label={t('savedForLater')}>
          <h3 className="t-label mb-3 text-ink-2">{t('savedForLater')}</h3>
          <ul className="divide-y divide-line">
            {view.saved.map((l) => (
              <BagLine key={l.id} line={l} refresh={refresh} students={students} compact={compact} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BagLine({
  line,
  refresh,
  students,
  compact,
}: {
  line: CartLineView;
  refresh: Props['refresh'];
  students: { id: string; name: string }[];
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { setCount } = useStore();
  const [qty, setQty] = React.useState(line.qty);
  const [busy, setBusy] = React.useState(false);
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [-120, -40, 0], [1, 0.6, 0]);

  const [prevQty, setPrevQty] = React.useState(line.qty);
  if (prevQty !== line.qty) {
    setPrevQty(line.qty);
    setQty(line.qty);
  }

  async function remove() {
    haptic();
    setBusy(true);
    const res = await removeCartItem(line.id);
    setBusy(false);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    setCount(res.data.count);
    await refresh();
    toast(t('bag.removed'), {
      action: {
        label: t('bag.undo'),
        onClick: async () => {
          const r = await restoreCartItem(res.data.restore);
          if (r.ok) {
            setCount(r.data.count);
            await refresh();
          }
        },
      },
    });
  }

  async function changeQty(q: number) {
    const prev = qty;
    setQty(q); // optimistic
    const res = await updateCartQty(line.id, q);
    if (!res.ok) {
      setQty(prev);
      return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    }
    setCount(res.data.count);
    await refresh();
  }

  async function toggleSaved() {
    const res = await toggleSaveForLater(line.id);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    setCount(res.data.count);
    await refresh();
  }

  async function assign(studentId: string) {
    const res = await assignCartStudent(line.id, studentId || null);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    await refresh();
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden"
    >
      {/* Swipe-to-remove backdrop (touch). */}
      <motion.div style={{ opacity: revealOpacity }} className="absolute inset-y-0 right-0 flex w-32 items-center justify-end bg-red pr-5 text-[13px] font-medium text-white md:hidden" aria-hidden>
        {t('bag.remove')}
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) void remove();
          else animate(x, 0, { type: 'spring', stiffness: 500, damping: 40 });
        }}
        className={cn('relative flex gap-4 bg-bg py-4 md:!transform-none', busy && 'opacity-50')}
      >
        <Link href={`/p/${line.productSlug}`} className="relative block aspect-[4/5] w-[84px] shrink-0 overflow-hidden rounded-[3px] bg-bg-subtle md:w-[104px]">
          {line.image && (
            <Image src={line.image} alt="" fill sizes="104px" className="object-contain p-1.5" placeholder={line.imageBlur ? 'blur' : 'empty'} blurDataURL={line.imageBlur ?? undefined} />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/p/${line.productSlug}`} className="t-body line-clamp-2 font-medium">
                {line.name}
              </Link>
              <p className="t-caption mt-0.5 text-ink-2">
                {t('product.size')} {sizeLabel(line.size, locale)} · {line.color}
              </p>
            </div>
            <div className="text-right">
              <p className="t-body tabular font-medium">{formatBs(line.lineTotalCents)}</p>
              {line.lineDiscountCents > 0 && <p className="t-caption tabular text-success">−{formatBs(line.lineDiscountCents)}</p>}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {line.bundleName && <Badge tone="accentSoft">{t('bag.bundleTag')} · {line.bundleName}</Badge>}
            {line.preorder && (
              <Badge tone="warning">
                {t('bag.preorderItem')}
                {line.preorderDate ? ` · ${formatDate(line.preorderDate, locale, { year: undefined })}` : ''}
              </Badge>
            )}
            {line.insufficient && <Badge tone="red">{t('bag.outOfStock')}</Badge>}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            {!line.savedForLater && (
              <QuantityStepper
                label={t('bag.qty')}
                decreaseLabel={t('bag.decrease')}
                increaseLabel={t('bag.increase')}
                value={qty}
                onChange={changeQty}
                max={Math.max(qty, line.preorder ? 20 : Math.min(20, line.available))}
              />
            )}
            {!compact && students.length > 0 && !line.savedForLater && (
              <label className="relative">
                <span className="sr-only">{t('product.whoFor')}</span>
                <select
                  value={line.studentId ?? ''}
                  onChange={(e) => assign(e.target.value)}
                  className="h-10 appearance-none rounded-full bg-bg-subtle pr-8 pl-4 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">{t('product.whoForNone')}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </label>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={toggleSaved} className="pressable t-caption rounded-full px-2 py-2 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {line.savedForLater ? t('bag.moveToBag') : t('bag.saveForLater')}
              </button>
              <button type="button" onClick={remove} className="pressable t-caption rounded-full px-2 py-2 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {t('bag.remove')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.li>
  );
}
