import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatBs } from '@/lib/money';
import { formatDateTime, formatTime, laPazDate, laPazToday } from '@/lib/dates';
import { PageHeader, StatCard, Card, Empty, StatusBadge, PAY_TONE } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';

export default async function AdminDashboard({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ denied?: string }> }) {
  const { locale } = await params;
  const user = await requireAdminPage();
  const t = await getTranslations('admin');
  const today = laPazToday();
  const start = laPazDate(today, '00:00');
  const end = laPazDate(today, '23:59');
  const weekAgo = new Date(start.getTime() - 6 * 86_400_000);
  const live = { status: { notIn: ['CANCELLED', 'EXPIRED'] as ('CANCELLED' | 'EXPIRED')[] } };

  const [todaySales, weekSales, toVerify, toPrepare, ready, lowStock, queue, pickups, exchanges] = await Promise.all([
    db.order.aggregate({ where: { ...live, createdAt: { gte: start } }, _sum: { totalCents: true }, _count: true }),
    db.order.aggregate({ where: { ...live, createdAt: { gte: weekAgo } }, _sum: { totalCents: true }, _count: true }),
    db.order.count({ where: { ...live, paymentStatus: 'SUBMITTED' } }),
    db.order.count({ where: { OR: [{ status: 'PAYMENT_VERIFIED' }, { status: 'RECEIVED', paymentMethod: 'CASH' }, { status: 'PREPARING' }] } }),
    db.order.count({ where: { status: 'READY' } }),
    db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "Variant" v JOIN "Product" p ON p.id = v."productId" WHERE v.active AND p.status = 'ACTIVE' AND v.stock <= v."reorderPoint"`,
    db.order.findMany({ where: { ...live, paymentStatus: 'SUBMITTED' }, orderBy: { createdAt: 'asc' }, take: 6, include: { proofs: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
    db.order.findMany({ where: { status: { in: ['READY', 'PREPARING', 'PAYMENT_VERIFIED'] }, pickupSlot: { startsAt: { gte: start, lte: end } } }, include: { pickupSlot: true }, orderBy: { pickupSlot: { startsAt: 'asc' } }, take: 12 }),
    db.exchangeRequest.count({ where: { status: 'REQUESTED' } }),
  ]);
  const denied = (await searchParams).denied === '1';

  return (
    <>
      <PageHeader title={t('dashboard.hello', { name: (user.name ?? '').split(' ')[0] })} actions={<ButtonLink href="/admin/pickup">{t('dashboard.scan')}</ButtonLink>} />
      {denied && <p className="t-caption mb-6 rounded-[10px] bg-red-soft p-3 text-red">{t('common.forbidden')}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('dashboard.today')} value={formatBs(todaySales._sum.totalCents ?? 0)} hint={t('common.results', { count: todaySales._count })} />
        <StatCard label={t('dashboard.week')} value={formatBs(weekSales._sum.totalCents ?? 0)} hint={t('common.results', { count: weekSales._count })} />
        <StatCard label={t('dashboard.toVerify')} value={toVerify} tone={toVerify ? 'warning' : undefined} />
        <StatCard label={t('dashboard.lowStock')} value={Number(lowStock[0]?.n ?? 0)} tone={Number(lowStock[0]?.n ?? 0) ? 'red' : undefined} />
        <StatCard label={t('dashboard.toPrepare')} value={toPrepare} />
        <StatCard label={t('dashboard.ready')} value={ready} tone={ready ? 'success' : undefined} />
        <StatCard label={t('dashboard.openExchanges')} value={exchanges} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title={t('dashboard.verifyQueue')} actions={<Link href="/admin/orders?payment=SUBMITTED" className="t-caption underline underline-offset-4">{t('dashboard.viewAll')}</Link>}>
          {queue.length === 0 ? (
            <Empty title={t('dashboard.noQueue')} />
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="pressable flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="t-body block font-medium">
                        {o.code} · {o.name}
                      </span>
                      <span className="t-caption text-ink-2">
                        {formatDateTime(o.createdAt, locale)} · {o.paymentMethod} {o.proofs[0]?.reference ? `· ${o.proofs[0].reference}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="t-body tabular">{formatBs(o.totalCents)}</span>
                      <StatusBadge tone={PAY_TONE[o.paymentStatus]}>{o.paymentStatus}</StatusBadge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t('dashboard.pickupsToday')} actions={<Link href="/admin/pickup" className="t-caption underline underline-offset-4">{t('nav.pickup')}</Link>}>
          {pickups.length === 0 ? (
            <Empty title={t('dashboard.noQueue')} />
          ) : (
            <ul className="divide-y divide-line">
              {pickups.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="pressable flex items-center justify-between gap-3 py-3">
                    <span className="t-body">
                      <span className="tabular font-medium">{o.pickupSlot && formatTime(o.pickupSlot.startsAt, locale)}</span> · {o.code} · {o.pickupName}
                    </span>
                    <StatusBadge tone={o.status === 'READY' ? 'success' : 'warning'}>{o.status}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="mt-10 flex items-center gap-3 text-ink-3">
        <Image src="/brand/sccs-crest.jpg" alt="" width={24} height={24} className="rounded mix-blend-multiply dark:hidden" />
        <span className="t-label">SCCS Store · Admin</span>
      </div>
    </>
  );
}
