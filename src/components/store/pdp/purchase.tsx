'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SizeGrid } from '@/components/ui/size-grid';
import { SwatchGroup } from '@/components/ui/swatch';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { needsRecheck } from '@/lib/students';
import { sizeLabel, gradeLabel } from '@/config/catalog';
import { confirmStudentSize } from '@/actions/students';
import { createStockAlert } from '@/actions/favorites';
import { useStore } from '../store-provider';
import { FavoriteButton } from '../favorite-button';
import { SizeGuide } from './size-guide';

export type PurchaseVariant = {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  priceCents: number;
  compareAtCents: number | null;
  available: number;
};

/**
 * Size grid, student selector and sticky "Add to bag" bar.
 * Selecting a student pre-selects their saved size for this garment and,
 * when it's old, asks "Still fits?".
 */
export function Purchase({
  productId,
  productName,
  garmentType,
  variants,
  allowPreorder,
  preorderDate,
  sized,
}: {
  productId: string;
  productName: string;
  garmentType: string | null;
  variants: PurchaseVariant[];
  allowPreorder: boolean;
  preorderDate: string | null;
  sized: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { students, addToCart, user } = useStore();
  const colors = [...new Map(variants.map((v) => [v.color, { value: v.color, label: v.color, hex: v.colorHex }])).values()];
  const [color, setColor] = React.useState(colors[0]?.value ?? '');
  const forColor = variants.filter((v) => v.color === color);
  const [studentId, setStudentId] = React.useState<string | null>(students.length === 1 ? students[0].id : null);
  const student = students.find((s) => s.id === studentId) ?? null;
  const saved = student && garmentType ? student.sizes[garmentType] : undefined;
  const [size, setSize] = React.useState<string | null>(() => {
    if (!sized) return forColor[0]?.size ?? null;
    return saved && forColor.some((v) => v.size === saved.size) ? saved.size : null;
  });
  const [recheckDismissed, setRecheckDismissed] = React.useState(false);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const [notifyOpen, setNotifyOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [hint, setHint] = React.useState(false);

  const selected = forColor.find((v) => v.size === size) ?? null;
  const months = needsRecheck(saved);
  const soldOut = selected ? selected.available <= 0 : forColor.every((v) => v.available <= 0);
  const preorder = soldOut && allowPreorder;
  const minPrice = Math.min(...forColor.map((v) => v.priceCents));
  const price = selected?.priceCents ?? minPrice;
  const compareAt = selected?.compareAtCents ?? forColor.find((v) => v.priceCents === minPrice)?.compareAtCents ?? null;

  function chooseStudent(id: string | null) {
    setStudentId(id);
    setRecheckDismissed(false);
    const s = students.find((x) => x.id === id);
    const sv = s && garmentType ? s.sizes[garmentType] : undefined;
    if (sv && forColor.some((v) => v.size === sv.size)) setSize(sv.size);
  }

  async function add() {
    if (!selected) {
      setHint(true);
      document.getElementById('size-grid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (soldOut && !allowPreorder) {
      setNotifyOpen(true);
      return;
    }
    setAdding(true);
    await addToCart({
      variantId: selected.id,
      studentId,
      label: student ? t('product.addedFor', { name: student.name }) : t('product.added'),
    });
    setAdding(false);
  }

  const cta = soldOut && !allowPreorder ? t('product.notifyMe') : preorder ? t('product.preorderCta') : student ? t('product.addFor', { name: student.name }) : t('product.addToBag');

  return (
    <div className="space-y-7">
      <p className="t-title tabular flex items-baseline gap-2">
        <span className={compareAt && compareAt > price ? 'text-red' : ''}>{formatBs(price)}</span>
        {compareAt && compareAt > price && <s className="text-ink-3">{formatBs(compareAt)}</s>}
      </p>

      {colors.length > 1 && <SwatchGroup legend={t('product.color')} value={color} onChange={setColor} options={colors} />}

      {/* Who is this for? */}
      {user && (
        <div>
          <p className="t-label mb-3 text-ink-2">{t('product.whoFor')}</p>
          <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
            {students.map((s) => (
              <Chip key={s.id} size="sm" selected={s.id === studentId} onClick={() => chooseStudent(s.id === studentId ? null : s.id)}>
                {s.name} · {gradeLabel(s.grade, locale)}
              </Chip>
            ))}
            <Chip size="sm" selected={studentId === null} onClick={() => chooseStudent(null)}>
              {t('product.whoForNone')}
            </Chip>
            <Link href="/profile/students?new=1" className="pressable inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-medium text-ink-2 ring-1 ring-dashed ring-line-strong ring-inset hover:text-ink">
              + {t('product.addStudent')}
            </Link>
          </div>
        </div>
      )}

      {/* Still fits? */}
      {student && saved && months && !recheckDismissed && (
        <div className="rounded-[12px] bg-accent-soft p-4 animate-fade-up" role="status">
          <p className="t-body text-ink">{t('product.stillFits', { name: student.name, size: saved.size, months })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                setSize(saved.size);
                setRecheckDismissed(true);
                if (garmentType) await confirmStudentSize(student.id, garmentType, saved.size);
              }}
            >
              {t('product.stillFitsYes')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setRecheckDismissed(true);
                setGuideOpen(true);
              }}
            >
              {t('product.stillFitsNo')}
            </Button>
          </div>
        </div>
      )}

      {sized && (
        <div id="size-grid">
          <div className="mb-3 flex items-center justify-between">
            <p className={`t-label ${hint && !selected ? 'text-red' : 'text-ink-2'}`}>{hint && !selected ? t('product.selectSizeFirst') : t('product.selectSize')}</p>
            <button type="button" onClick={() => setGuideOpen(true)} className="t-caption font-medium underline underline-offset-4">
              {t('product.sizeGuide')}
            </button>
          </div>
          <SizeGrid
            name="size"
            legend={t('product.size')}
            value={size}
            onChange={(s) => {
              setSize(s);
              setHint(false);
            }}
            allowSoldOut
            lowStockLabel={(n) => t('product.onlyLeft', { count: n })}
            soldOutLabel={t('product.soldOut')}
            preorderLabel={t('product.preorder')}
            savedLabel={student ? `${t('product.savedSize')} · ${student.name}` : t('product.savedSize')}
            options={forColor.map((v) => ({
              size: v.size,
              label: sizeLabel(v.size, locale),
              available: v.available,
              preorder: allowPreorder,
              saved: !!saved && saved.size === v.size,
            }))}
          />
        </div>
      )}

      {!sized && selected && selected.available > 0 && selected.available <= 3 && <p className="t-caption text-red">{t('product.onlyLeft', { count: selected.available })}</p>}

      {preorder && (
        <p className="t-caption rounded-[10px] bg-warning-soft p-3 text-warning">
          {t('product.preorderNote')}
          {preorderDate && <> {t('product.preorderBy', { date: formatDate(preorderDate, locale, { year: undefined }) })}</>}
        </p>
      )}

      {/* Inline CTA (desktop) */}
      <div className="hidden gap-2 md:flex">
        <Button size="lg" block onClick={add} loading={adding}>
          {cta}
        </Button>
        <FavoriteButton productId={productId} size="md" className="size-[52px]" />
      </div>

      {/* Sticky bottom bar (mobile, thumb zone, above the tab bar) */}
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[var(--z-sticky)] border-t border-line bg-bg/92 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Button size="lg" block onClick={add} loading={adding}>
            {cta}
            {selected && !soldOut && <span className="tabular opacity-70">· {formatBs(selected.priceCents)}</span>}
          </Button>
          <FavoriteButton productId={productId} size="md" className="size-[52px]" />
        </div>
      </div>

      <SizeGuide open={guideOpen} onOpenChange={setGuideOpen} sizes={forColor.map((v) => v.size)} onPick={(s) => setSize(s)} />
      <NotifySheet open={notifyOpen} onOpenChange={setNotifyOpen} productId={productId} variantId={selected?.id ?? null} productName={productName} />
    </div>
  );
}

function NotifySheet({ open, onOpenChange, productId, variantId, productName }: { open: boolean; onOpenChange: (o: boolean) => void; productId: string; variantId: string | null; productName: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = React.useState('');
  const [pending, setPending] = React.useState(false);
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('product.notifyMe')} description={productName}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await createStockAlert({ productId, variantId, email, locale: locale as 'es' | 'en' });
          setPending(false);
          if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
          toast(t('product.notifyMeDone'));
          onOpenChange(false);
        }}
      >
        <Field label={t('product.notifyEmail')} htmlFor="notify-email">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" block loading={pending}>
          {t('product.notifyMe')}
        </Button>
      </form>
    </BottomSheet>
  );
}
