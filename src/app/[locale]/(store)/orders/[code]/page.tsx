import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { canViewOrder, TRACK_STEPS } from '@/lib/order-rules';
import { getSettings, pickupLocation } from '@/lib/settings';
import { formatBs } from '@/lib/money';
import { addDays, formatDate, formatDateTime, formatSlot } from '@/lib/dates';
import { clickToChat } from '@/lib/notify/whatsapp';
import { Stepper } from '@/components/ui/stepper';
import { Badge } from '@/components/ui/badge';
import { QrCode } from '@/components/ui/qr-code';
import { ButtonLink } from '@/components/ui/button';
import { CopyButton } from '@/components/store/copy-button';
import { ProofForm } from './proof-form';
import { ExchangeButton } from './exchange-button';
import { ReorderButton } from './reorder-button';

type Props = { params: Promise<{ locale: string; code: string }>; searchParams: Promise<{ t?: string; new?: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [order, viewer, settings, t] = await Promise.all([
    db.order.findUnique({
      where: { code },
      include: {
        items: { include: { exchanges: { orderBy: { createdAt: 'desc' } } } },
        events: { orderBy: { createdAt: 'asc' } },
        proofs: { orderBy: { createdAt: 'desc' } },
        pickupSlot: true,
      },
    }),
    getCurrentUser(),
    getSettings(),
    getTranslations(),
  ]);
  if (!order || !canViewOrder(order, viewer, sp.t)) notFound();

  const closed = order.status === 'CANCELLED' || order.status === 'EXPIRED';
  const currentIdx = TRACK_STEPS.indexOf(order.status);
  const at = (s: string) => order.events.findLast((e) => e.status === s)?.createdAt;
  const steps = TRACK_STEPS.filter((s) => !(s === 'PAYMENT_VERIFIED' && order.paymentMethod === 'CASH')).map((s) => ({
    id: s,
    label: t(`order.status${s}`),
    description: s === order.status ? t(`order.desc${s}` as 'order.descRECEIVED') : undefined,
    at: at(s) ? formatDateTime(at(s)!, locale) : undefined,
  }));
  const stepIdx = steps.findIndex((s) => s.id === order.status);
  const needsProof = ['QR', 'TRANSFER'].includes(order.paymentMethod) && ['PENDING', 'REJECTED'].includes(order.paymentStatus) && !closed;
  const lastRejected = order.proofs.find((p) => p.status === 'REJECTED');
  const location = pickupLocation(settings.store, locale);
  const exchangeOpen = order.status === 'PICKED_UP' && order.pickedUpAt && addDays(order.pickedUpAt, settings.store.exchangeDays) > new Date();
  const isOwner = viewer?.id === order.userId;
  const token = sp.t ?? (isOwner || viewer?.role !== 'CUSTOMER' ? order.pickupToken : undefined);
  const p = settings.payments;

  return (
    <div className="container-page pt-6 pb-16 md:pt-12">
      {sp.new === '1' && (
        <div className="mb-8 rounded-[4px] bg-accent p-6 text-accent-ink animate-fade-up md:p-10">
          <p className="t-label opacity-80">{t('order.code')} · {order.code}</p>
          <h1 className="t-h1 mt-3">{t('order.thanks')}</h1>
          <p className="t-body mt-3 max-w-lg opacity-90">{t('order.thanksBody', { email: order.email })}</p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-label text-ink-2">{t('order.placedOn', { date: formatDate(order.createdAt, locale) })}</p>
          {sp.new !== '1' && <h1 className="t-h1 mt-2">{t('order.title', { code: order.code })}</h1>}
        </div>
        <div className="flex gap-2">
          <Badge tone={order.paymentStatus === 'VERIFIED' ? 'success' : order.paymentStatus === 'REJECTED' ? 'red' : 'warning'}>{t(`order.payStatus${order.paymentStatus}`)}</Badge>
          {closed && <Badge tone="red">{t(`order.status${order.status}`)}</Badge>}
        </div>
      </div>

      <div className="mt-8 grid gap-12 md:grid-cols-[1fr_380px] md:gap-16">
        <div className="space-y-12">
          {closed ? (
            <p className="t-body rounded-[12px] bg-red-soft p-5 text-red">{order.status === 'EXPIRED' ? t('order.expired') : t('order.cancelled')}</p>
          ) : (
            <section aria-labelledby="track">
              <h2 id="track" className="t-title mb-5">
                {t('order.track')}
              </h2>
              <Stepper steps={steps} current={stepIdx === -1 ? currentIdx : stepIdx} />
            </section>
          )}

          {/* Payment */}
          {!closed && order.paymentStatus !== 'VERIFIED' && (
            <section aria-labelledby="pay" className="rounded-[4px] bg-bg-subtle p-5 md:p-8">
              <h2 id="pay" className="t-title">
                {order.paymentMethod === 'CASH' ? t('order.cashTitle') : t('order.payNow')}
              </h2>
              {order.paymentMethod === 'CASH' && (
                <p className="t-body mt-2 text-ink-2">{t('order.cashBody', { date: order.expiresAt ? formatDate(order.expiresAt, locale) : '—', location })}</p>
              )}
              {order.paymentMethod === 'QR' && (
                <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
                  <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-[12px] bg-white p-2">
                    <Image src={p.qrImage} alt={t('order.qrTitle')} fill sizes="220px" className="object-contain" unoptimized={p.qrImage.endsWith('.svg')} />
                  </div>
                  <div className="space-y-4">
                    <p className="t-body">{t('order.qrTitle')}</p>
                    <div>
                      <p className="t-label text-ink-2">{t('order.qrAmount')}</p>
                      <p className="t-h2 tabular mt-1">{formatBs(order.totalCents)}</p>
                    </div>
                    <div>
                      <p className="t-label text-ink-2">{t('order.qrReference')}</p>
                      <p className="mt-1 flex items-center gap-2 font-mono text-[18px] font-medium">
                        {order.code} <CopyButton value={order.code} />
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {order.paymentMethod === 'TRANSFER' && (
                <dl className="t-body mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    [t('order.bankName'), p.bankName],
                    [t('order.bankHolder'), p.accountHolder],
                    [t('order.bankAccount'), p.accountNumber],
                    [t('order.bankType'), locale === 'en' ? p.accountTypeEn : p.accountTypeEs],
                    [t('order.bankNit'), p.nit],
                    [t('order.qrAmount'), formatBs(order.totalCents)],
                    [t('order.qrReference'), order.code],
                  ].map(([k, val]) => (
                    <div key={k} className="rounded-[10px] bg-bg p-3">
                      <dt className="t-label text-ink-2">{k}</dt>
                      <dd className="mt-1 flex items-center justify-between gap-2 font-medium">
                        <span className="tabular">{val}</span>
                        <CopyButton value={val} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {lastRejected && order.paymentStatus === 'REJECTED' && (
                <p className="t-caption mt-5 rounded-[10px] bg-red-soft p-3 text-red">{t('order.proofRejected', { reason: lastRejected.note ?? '—' })}</p>
              )}
              {order.paymentStatus === 'SUBMITTED' && <p className="t-caption mt-5 rounded-[10px] bg-bg p-3 text-ink-2">{t('order.proofSent')}</p>}
              {needsProof && <ProofForm code={order.code} token={token ?? null} />}
            </section>
          )}

          {/* Items */}
          <section aria-labelledby="items">
            <h2 id="items" className="t-title mb-3">
              {t('order.items')}
            </h2>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 py-4">
                  <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[3px] bg-bg-subtle">{it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-contain p-1" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="t-body font-medium">{it.productName}</p>
                      <p className="t-body tabular">{formatBs(it.unitPriceCents * it.qty - it.discountCents)}</p>
                    </div>
                    <p className="t-caption text-ink-2">
                      {t('product.size')} {it.size} · ×{it.qty}
                      {it.studentName && ` · ${t('order.for', { name: it.studentName })}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {it.bundleName && <Badge tone="accentSoft">{t('bag.bundleTag')} · {it.bundleName}</Badge>}
                      {it.preorder && <Badge tone="warning">{t('bag.preorderItem')}</Badge>}
                      {it.exchanges[0] && <Badge tone="outline">{t(`order.exchangeStatus${it.exchanges[0].status}`)}</Badge>}
                    </div>
                    {exchangeOpen && !it.exchanges.some((e) => ['REQUESTED', 'APPROVED'].includes(e.status)) && (
                      <ExchangeButton code={order.code} token={token ?? null} orderItemId={it.id} productName={it.productName} days={settings.store.exchangeDays} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="t-body mt-4 space-y-2 border-t border-line pt-4">
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('bag.subtotal')}</dt>
                <dd className="tabular">{formatBs(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>{t('bag.bundleDiscount')}</dt>
                  <dd className="tabular">−{formatBs(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[17px] font-medium">
                <dt>{t('bag.total')}</dt>
                <dd className="tabular">{formatBs(order.totalCents)}</dd>
              </div>
            </dl>
            {isOwner && <ReorderButton code={order.code} />}
          </section>
        </div>

        <aside className="space-y-6 md:sticky md:top-24 md:self-start">
          <section aria-labelledby="pickup" className="rounded-[4px] bg-bg-subtle p-5">
            <h2 id="pickup" className="t-title">
              {t('order.pickupQr')}
            </h2>
            {order.status === 'READY' ? (
              <>
                <p className="t-caption mt-1 text-ink-2">{t('order.pickupQrBody')}</p>
                <QrCode value={`SCCS:${order.pickupToken}`} label={`${t('order.pickupQr')} ${order.code}`} className="mt-4" />
                <p className="mt-3 text-center font-mono text-[18px] font-medium tracking-wider">{order.code}</p>
              </>
            ) : order.status === 'PICKED_UP' ? (
              <p className="t-body mt-2 text-success">{t('order.pickedUpBy', { name: order.pickupName })} · {order.pickedUpAt && formatDateTime(order.pickedUpAt, locale)}</p>
            ) : (
              <div className="mt-4 grid aspect-square place-items-center rounded-[12px] bg-bg text-center">
                <p className="t-caption max-w-[200px] text-ink-2">{t('order.pickupQrLocked')}</p>
              </div>
            )}
            <dl className="t-caption mt-5 space-y-3">
              <div>
                <dt className="t-label text-ink-2">{t('order.pickupSlot')}</dt>
                <dd className="t-body mt-0.5">{order.pickupSlot ? formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt, locale) : t('order.pickupTBD')}</dd>
              </div>
              <div>
                <dt className="t-label text-ink-2">{t('order.pickupLocation')}</dt>
                <dd className="t-body mt-0.5">{location}</dd>
              </div>
              <div>
                <dt className="t-label text-ink-2">{t('checkout.whoPicksUp')}</dt>
                <dd className="t-body mt-0.5">{order.pickupName}</dd>
              </div>
            </dl>
          </section>
          <a
            href={clickToChat(settings.store.whatsapp, `${locale === 'en' ? 'Hi! About my order' : 'Hola, consulta sobre mi pedido'} ${order.code}`)}
            target="_blank"
            rel="noreferrer"
            className="pressable flex h-12 items-center justify-center gap-2 rounded-full ring-1 ring-line-strong ring-inset hover:ring-ink"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z" />
            </svg>
            {t('order.whatsappHelp')}
          </a>
          {!viewer && (
            <div className="rounded-[4px] p-5 ring-1 ring-line ring-inset">
              <p className="t-title">{t('order.createAccount')}</p>
              <p className="t-caption mt-1 text-ink-2">{t('order.createAccountBody', { email: order.email })}</p>
              <ButtonLink href={`/register?email=${encodeURIComponent(order.email)}&callbackUrl=/profile`} variant="secondary" className="mt-4">
                {t('order.createAccountCta')}
              </ButtonLink>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
