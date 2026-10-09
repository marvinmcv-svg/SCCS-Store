import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { TRANSITIONS } from '@/lib/orders';
import { formatBs } from '@/lib/money';
import { formatDate, formatDateTime, formatSlot } from '@/lib/dates';
import { gradeLabel } from '@/config/catalog';
import { Card, PageHeader, StatusBadge, ORDER_TONE, PAY_TONE } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { OrderActions, ProofActions } from './order-actions';

export const metadata: Metadata = { title: 'Pedido' };

export default async function AdminOrderDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage('manageOrders');
  const t = await getTranslations();
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: 'desc' } },
      proofs: { orderBy: { createdAt: 'desc' }, include: { reviewedBy: { select: { name: true } } } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
      pickupSlot: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) notFound();
  const actors = await db.user.findMany({ where: { id: { in: order.events.map((e) => e.actorId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const next = TRANSITIONS[order.status].filter((s) => s !== 'EXPIRED');

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/orders" className="t-caption mb-3 inline-block text-ink-2 hover:text-ink">
            ← {t('admin.orders.title')}
          </Link>
        }
        title={t('admin.orders.detail', { code: order.code })}
        description={formatDateTime(order.createdAt, locale)}
        actions={
          <>
            <StatusBadge tone={ORDER_TONE[order.status]}>{t(`order.status${order.status}`)}</StatusBadge>
            <StatusBadge tone={PAY_TONE[order.paymentStatus]}>{t(`order.payStatus${order.paymentStatus}`)}</StatusBadge>
            <Link href={`/admin/orders/${order.id}/print`} target="_blank" className="pressable inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset ring-line-strong hover:ring-ink">
              {t('admin.common.print')}
            </Link>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <OrderActions orderId={order.id} status={order.status} next={next} paymentMethod={order.paymentMethod} paymentStatus={order.paymentStatus} />

          <Card title={t('admin.orders.proofs')}>
            {order.paymentMethod === 'CASH' ? (
              <p className="t-body text-ink-2">
                {t('checkout.methodCASH')}
                {order.expiresAt && ` · ${t('admin.orders.expires', { date: formatDate(order.expiresAt, locale) })}`}
              </p>
            ) : order.proofs.length === 0 ? (
              <p className="t-body text-ink-2">{t('admin.orders.noProofs')}</p>
            ) : (
              <ul className="space-y-4">
                {order.proofs.map((p) => (
                  <li key={p.id} className="rounded-[12px] bg-bg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="t-caption text-ink-2">{formatDateTime(p.createdAt, locale)}</span>
                      <Badge tone={p.status === 'APPROVED' ? 'success' : p.status === 'REJECTED' ? 'red' : 'warning'}>{p.status}</Badge>
                    </div>
                    {p.reference && (
                      <p className="t-body mt-2">
                        {t('admin.orders.reference')}: <span className="font-mono font-medium">{p.reference}</span>
                      </p>
                    )}
                    {p.fileKey &&
                      (p.fileType === 'application/pdf' ? (
                        <a href={`/api/files/${p.fileKey}`} target="_blank" rel="noreferrer" className="t-body mt-2 inline-block font-medium underline underline-offset-4">
                          PDF · {t('admin.orders.viewFile')}
                        </a>
                      ) : (
                        <a href={`/api/files/${p.fileKey}`} target="_blank" rel="noreferrer" className="mt-3 block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/files/${p.fileKey}`} alt={t('admin.orders.proofs')} className="max-h-[420px] w-auto rounded-[8px] ring-1 ring-line" />
                        </a>
                      ))}
                    {p.note && <p className="t-caption mt-2 text-red">{p.note}</p>}
                    {p.reviewedBy && <p className="t-caption mt-1 text-ink-2">✓ {p.reviewedBy.name}</p>}
                    {p.status === 'PENDING' && order.paymentStatus !== 'VERIFIED' && <ProofActions orderId={order.id} proofId={p.id} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('admin.orders.items')}>
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-4 py-3">
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-[3px] bg-bg">{it.image && <Image src={it.image} alt="" fill sizes="56px" className="object-contain p-1" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="t-body font-medium">{it.productName}</p>
                      <p className="tabular">{formatBs(it.unitPriceCents * it.qty - it.discountCents)}</p>
                    </div>
                    <p className="t-caption text-ink-2">
                      <span className="font-mono">{it.sku}</span> · {t('product.size')} {it.size} · ×{it.qty}
                      {it.studentName && ` · ${it.studentName}${it.studentGrade ? ` (${gradeLabel(it.studentGrade, locale)})` : ''}`}
                    </p>
                    <div className="mt-1 flex gap-1.5">
                      {it.bundleName && <Badge tone="accentSoft">{it.bundleName}</Badge>}
                      {it.preorder && <Badge tone="warning">{t('admin.orders.preorder')}</Badge>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="t-body mt-3 space-y-1 border-t border-line pt-3">
              <div className="flex justify-between">
                <dt className="text-ink-2">{t('bag.subtotal')}</dt>
                <dd className="tabular">{formatBs(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-success">
                  <dt>
                    {t('bag.bundleDiscount')}
                    {order.promoCode && ` · ${order.promoCode}`}
                  </dt>
                  <dd className="tabular">−{formatBs(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[17px] font-medium">
                <dt>{t('bag.total')}</dt>
                <dd className="tabular">{formatBs(order.totalCents)}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t('admin.orders.contact')}>
            <dl className="t-body space-y-3">
              <div>
                <dt className="t-label text-ink-2">{t('admin.orders.customer')}</dt>
                <dd>
                  {order.name} {order.user && <Badge tone="outline">account</Badge>}
                </dd>
                <dd className="t-caption text-ink-2">{order.email}</dd>
                <dd className="t-caption text-ink-2">{order.phone}</dd>
              </div>
              <div>
                <dt className="t-label text-ink-2">{t('admin.orders.pickupBy')}</dt>
                <dd>
                  {order.pickupName} · {order.pickupPhone}
                </dd>
              </div>
              <div>
                <dt className="t-label text-ink-2">{t('admin.orders.slot')}</dt>
                <dd>{order.pickupSlot ? formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt, locale) : t('order.pickupTBD')}</dd>
              </div>
              {order.notes && (
                <div>
                  <dt className="t-label text-ink-2">{t('admin.orders.notes')}</dt>
                  <dd className="rounded-[8px] bg-warning-soft p-2 text-warning">{order.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title={t('admin.orders.notifications')}>
            {order.notifications.length === 0 ? (
              <p className="t-caption text-ink-2">—</p>
            ) : (
              <ul className="space-y-2">
                {order.notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-2">
                    <span className="t-caption">
                      {t(`admin.orders.channel${n.channel}`)} · {n.template}
                      <span className="block text-ink-3">{formatDateTime(n.createdAt, locale)}</span>
                    </span>
                    {n.link ? (
                      <a href={n.link} target="_blank" rel="noreferrer" className="pressable t-label shrink-0 rounded-full bg-[#25d366] px-3 py-1.5 text-white">
                        {t('admin.orders.waSend')}
                      </a>
                    ) : (
                      <Badge tone={n.status === 'SENT' ? 'success' : n.status === 'FAILED' ? 'red' : 'subtle'}>{t(`admin.orders.nstatus${n.status}`)}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('admin.orders.timeline')}>
            <ol className="space-y-3">
              {order.events.map((e) => (
                <li key={e.id} className="t-caption">
                  <span className="font-medium text-ink">{e.status ? t(`order.status${e.status}`) : e.type}</span>
                  {e.note && <span className="text-ink-2"> · {e.note}</span>}
                  <span className="block text-ink-3">
                    {formatDateTime(e.createdAt, locale)}
                    {e.actorId && ` · ${actors.find((a) => a.id === e.actorId)?.name ?? ''}`}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
