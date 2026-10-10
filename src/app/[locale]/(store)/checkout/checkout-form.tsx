'use client';

import * as React from 'react';
import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import type { PaymentMethod } from '@prisma/client';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Stepper } from '@/components/ui/stepper';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { CartView } from '@/lib/cart';
import { startCheckout, placeOrder } from '@/actions/checkout';
import { useStore } from '@/components/store/store-provider';

const phoneRe = (v: string) => /^[67]\d{7}$/.test(v.replace(/[^\d]/g, '').replace(/^591/, ''));
const schema = z
  .object({
    name: z.string().trim().min(2, 'required'),
    email: z.string().trim().email('invalidEmail'),
    phone: z.string().refine(phoneRe, 'invalidPhone'),
    pickupSelf: z.boolean(),
    pickupName: z.string().optional(),
    pickupPhone: z.string().optional(),
    slotId: z.string().nullable(),
    paymentMethod: z.enum(['QR', 'TRANSFER', 'CASH', 'CARD']).nullable(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.pickupSelf) {
      if (!v.pickupName || v.pickupName.trim().length < 2) ctx.addIssue({ code: 'custom', path: ['pickupName'], message: 'required' });
      if (!v.pickupPhone || !phoneRe(v.pickupPhone)) ctx.addIssue({ code: 'custom', path: ['pickupPhone'], message: 'invalidPhone' });
    }
    if (!v.paymentMethod) ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'required' });
  });
type Values = z.infer<typeof schema>;

type Slot = { id: string; label: string; left: number };

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = Math.max(0, new Date(expiresAt).getTime() - now);
  return { ms, label: `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` };
}

export function CheckoutForm({
  view,
  user,
  slots,
  methods,
  location,
}: {
  view: CartView;
  user: { name: string; email: string; phone: string } | null;
  slots: Slot[];
  methods: PaymentMethod[];
  location: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { setCount } = useStore();
  const [hold, setHold] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);
  // One key per checkout visit: retries / double taps can't create two orders.
  const [idempotencyKey] = React.useState(() => crypto.randomUUID().replace(/-/g, ''));
  const countdown = useCountdown(hold);

  const { register, handleSubmit, control, setValue, formState, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      pickupSelf: true,
      slotId: slots.find((s) => s.left > 0)?.id ?? null,
      paymentMethod: methods[0] ?? null,
      notes: '',
    },
  });
  const v = useWatch({ control });

  const refreshHold = React.useCallback(async () => {
    const res = await startCheckout();
    if (res.ok) {
      setHold(res.data.expiresAt);
      setIssues(res.data.issues);
    } else if (res.error === 'EMPTY_CART') router.replace('/bag');
  }, [router]);

  React.useEffect(() => {
    let alive = true;
    startCheckout().then((res) => {
      if (!alive) return;
      if (res.ok) {
        setHold(res.data.expiresAt);
        setIssues(res.data.issues);
      } else if (res.error === 'EMPTY_CART') router.replace('/bag');
    });
    return () => {
      alive = false;
    };
  }, [router]);

  // When the hold lapses, re-check stock and renew it.
  const expired = countdown?.ms === 0;
  React.useEffect(() => {
    if (!expired) return;
    toast(t('checkout.holdExpired'));
    const id = setTimeout(() => void refreshHold(), 0);
    return () => clearTimeout(id);
  }, [expired, refreshHold, t]);

  const contactDone = !!(v.name && v.email && v.phone && (v.pickupSelf || (v.pickupName && v.pickupPhone)));
  const step = !contactDone ? 0 : !v.paymentMethod ? 1 : 2;
  const err = (k: keyof Values) => {
    const m = formState.errors[k]?.message;
    return m ? t(`errors.${m}` as 'errors.required') : undefined;
  };

  async function onSubmit(values: Values) {
    setFormError(null);
    const res = await placeOrder({
      ...values,
      paymentMethod: values.paymentMethod!,
      idempotencyKey,
      locale: locale as 'es' | 'en',
    });
    if (!res.ok) {
      haptic('error');
      if (res.fields) for (const [k, m] of Object.entries(res.fields)) setError(k as keyof Values, { message: m });
      setFormError(t(`errors.${res.error}` as 'errors.UNKNOWN'));
      if (res.error === 'STOCK_CHANGED' || res.error === 'SLOT_FULL') router.refresh();
      return;
    }
    haptic('success');
    setCount(0);
    router.replace(`/orders/${res.data.code}?t=${res.data.token}&new=1`);
  }

  const sectionCls = 'border-t border-line pt-8';

  return (
    <form onSubmit={handleSubmit(onSubmit, () => haptic('error'))} noValidate className="container-page pt-6 pb-40 md:pt-12 md:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-h1">{t('checkout.title')}</h1>
        {countdown && (
          <Badge tone={countdown.ms < 120_000 ? 'red' : 'subtle'} aria-live="polite">
            {t('checkout.holdRemaining', { time: countdown.label })}
          </Badge>
        )}
      </div>
      <Stepper
        orientation="horizontal"
        current={step}
        className="mt-6 max-w-xl"
        steps={[
          { id: 'pickup', label: t('checkout.stepPickup') },
          { id: 'payment', label: t('checkout.stepPayment') },
          { id: 'review', label: t('checkout.stepReview') },
        ]}
      />

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_380px] md:gap-16">
        <div className="space-y-10">
          {!user && (
            <p className="t-caption rounded-[10px] bg-bg-subtle p-4 text-ink-2">
              {t('checkout.guestNote')}{' '}
              <Link href="/login?callbackUrl=/checkout" className="font-medium text-ink underline underline-offset-4">
                {t('auth.signIn')}
              </Link>
            </p>
          )}

          {/* 1 · Pickup */}
          <section aria-labelledby="s-contact" className="space-y-4">
            <h2 id="s-contact" className="t-title">
              1 · {t('checkout.contact')}
            </h2>
            <Field label={t('checkout.name')} htmlFor="name" error={err('name')}>
              <Input autoComplete="name" {...register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('checkout.email')} htmlFor="email" error={err('email')}>
                <Input type="email" inputMode="email" autoComplete="email" {...register('email')} />
              </Field>
              <Field label={t('checkout.phone')} htmlFor="phone" error={err('phone')} hint={t('checkout.phoneHint')}>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="7xxxxxxx" {...register('phone')} />
              </Field>
            </div>

            <fieldset className="pt-2">
              <legend className="t-label mb-3 text-ink-2">{t('checkout.whoPicksUp')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((self) => (
                  <label key={String(self)} className={cn('pressable flex h-12 cursor-pointer items-center justify-center rounded-[10px] text-[15px] font-medium ring-1 ring-inset', v.pickupSelf === self ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink-3')}>
                    <input type="radio" className="sr-only" checked={v.pickupSelf === self} onChange={() => setValue('pickupSelf', self, { shouldValidate: formState.isSubmitted })} />
                    {self ? t('checkout.sameAsBuyer') : t('checkout.someoneElse')}
                  </label>
                ))}
              </div>
            </fieldset>
            {!v.pickupSelf && (
              <div className="grid gap-4 sm:grid-cols-2 animate-fade-up">
                <Field label={t('checkout.pickupName')} htmlFor="pickupName" error={err('pickupName')}>
                  <Input autoComplete="off" {...register('pickupName')} />
                </Field>
                <Field label={t('checkout.pickupPhone')} htmlFor="pickupPhone" error={err('pickupPhone')}>
                  <Input type="tel" inputMode="tel" {...register('pickupPhone')} />
                </Field>
              </div>
            )}

            <fieldset className="pt-2">
              <legend className="t-label mb-1 text-ink-2">{t('checkout.slot')}</legend>
              <p className="t-caption mb-3 text-ink-2">{t('checkout.pickupAt', { location })}</p>
              <div className="space-y-2">
                {slots.length === 0 && <p className="t-caption rounded-[10px] bg-warning-soft p-3 text-warning">{t('checkout.noSlots')}</p>}
                {slots.map((s) => {
                  const full = s.left <= 0;
                  const selected = v.slotId === s.id;
                  return (
                    <label key={s.id} className={cn('pressable flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[10px] px-4 py-3 ring-1 ring-inset', selected ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink-3', full && 'cursor-not-allowed opacity-45')}>
                      <input type="radio" className="sr-only" disabled={full} checked={selected} onChange={() => setValue('slotId', s.id)} />
                      <span className="t-body font-medium">{s.label}</span>
                      <span className={cn('t-caption shrink-0', s.left <= 3 && !full ? 'text-red' : 'text-ink-2')}>{full ? t('checkout.slotFull') : t('checkout.slotLeft', { count: s.left })}</span>
                    </label>
                  );
                })}
                <label className={cn('pressable flex min-h-12 cursor-pointer items-center rounded-[10px] px-4 py-3 ring-1 ring-inset', v.slotId === null ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink-3')}>
                  <input type="radio" className="sr-only" checked={v.slotId === null} onChange={() => setValue('slotId', null)} />
                  <span className="t-body">{t('checkout.slotLater')}</span>
                </label>
              </div>
            </fieldset>
          </section>

          {/* 2 · Payment */}
          <section aria-labelledby="s-payment" className={sectionCls}>
            <h2 id="s-payment" className="t-title mb-4">
              2 · {t('checkout.payment')}
            </h2>
            <div className="rounded-[12px] p-4 ring-2 ring-ink ring-inset">
              <p className="t-body flex items-center gap-2 font-medium">
                <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
                </svg>
                {t('checkout.methodQR')}
              </p>
              <p className="t-caption mt-1 text-ink-2">{t('checkout.methodQRDesc')}</p>
              <ol className="mt-4 space-y-2">
                {(t.raw('checkout.qrSteps') as string[]).map((step, i) => (
                  <li key={step} className="t-caption flex items-center gap-3">
                    <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-bg-subtle text-[12px] font-semibold">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              {err('paymentMethod') && <p className="t-caption mt-3 text-red">{err('paymentMethod')}</p>}
            </div>
            <p className="t-caption mt-3 text-ink-2">{t('checkout.secure')}</p>
          </section>

          {/* 3 · Review */}
          <section aria-labelledby="s-review" className={sectionCls}>
            <h2 id="s-review" className="t-title mb-4">
              3 · {t('checkout.review')}
            </h2>
            <ul className="divide-y divide-line">
              {view.lines.map((l) => (
                <li key={l.id} className="flex gap-3 py-3">
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-[3px] bg-bg-subtle">{l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-contain p-1" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body block truncate font-medium">{l.name}</span>
                    <span className="t-caption block text-ink-2">
                      {l.size} · ×{l.qty}
                      {l.studentName && ` · ${t('bag.forStudent', { name: l.studentName })}`}
                    </span>
                    {(issues.includes(l.id) || l.insufficient) && <Badge tone="red" className="mt-1">{t('bag.outOfStock')}</Badge>}
                    {l.preorder && <Badge tone="warning" className="mt-1">{t('bag.preorderItem')}</Badge>}
                  </span>
                  <span className="t-body tabular">{formatBs(l.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Field label={t('checkout.notes')} htmlFor="notes" optional optionalLabel={t('common.optional')}>
                <Textarea rows={3} placeholder={t('checkout.notesPlaceholder')} {...register('notes')} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="space-y-4 rounded-[4px] bg-bg-subtle p-5">
            <h2 className="t-title">{t('bag.summary')}</h2>
            <dl className="t-body space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('bag.subtotal')}</dt>
                <dd className="tabular">{formatBs(view.pricing.subtotalCents)}</dd>
              </div>
              {view.pricing.bundleDiscountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>{t('bag.bundleDiscount')}</dt>
                  <dd className="tabular">−{formatBs(view.pricing.bundleDiscountCents)}</dd>
                </div>
              )}
              {view.pricing.promoDiscountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>{t('bag.promoDiscount')}</dt>
                  <dd className="tabular">−{formatBs(view.pricing.promoDiscountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-3 text-[17px] font-medium">
                <dt>{t('bag.total')}</dt>
                <dd className="tabular">{formatBs(view.pricing.totalCents)}</dd>
              </div>
            </dl>
            {formError && (
              <p role="alert" className="t-caption rounded-[10px] bg-red-soft p-3 text-red">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" block loading={formState.isSubmitting} className="hidden md:inline-flex">
              {t('checkout.placeOrder', { total: formatBs(view.pricing.totalCents) })}
            </Button>
            <p className="t-caption text-ink-2">{t('checkout.agree')}</p>
          </div>
        </aside>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-bg/92 px-4 pt-3 pb-3 backdrop-blur-xl md:hidden">
        {formError && <p className="t-caption mb-2 text-red">{formError}</p>}
        <Button type="submit" size="lg" block loading={formState.isSubmitting}>
          {t('checkout.placeOrder', { total: formatBs(view.pricing.totalCents) })}
        </Button>
      </div>
    </form>
  );
}
