import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatTime, laPazDate, laPazToday } from '@/lib/dates';
import { Card, PageHeader, StatusBadge, ORDER_TONE } from '@/components/admin/ui';
import { PickupScanner } from './pickup-scanner';

export const metadata: Metadata = { title: 'Recojo' };

export default async function PickupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage('managePickups');
  const t = await getTranslations();
  const today = laPazToday();
  const orders = await db.order.findMany({
    where: { status: { in: ['READY', 'PREPARING', 'PAYMENT_VERIFIED', 'PICKED_UP'] }, pickupSlot: { startsAt: { gte: laPazDate(today, '00:00'), lte: laPazDate(today, '23:59') } } },
    include: { pickupSlot: true },
    orderBy: { pickupSlot: { startsAt: 'asc' } },
  });
  return (
    <>
      <PageHeader title={t('admin.pickup.title')} description={t('admin.pickup.body')} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <PickupScanner />
        <Card title={t('admin.pickup.todays')}>
          {orders.length === 0 ? (
            <p className="t-caption text-ink-2">—</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="t-body">
                      <span className="tabular">{o.pickupSlot && formatTime(o.pickupSlot.startsAt, locale)}</span> · <span className="font-mono">{o.code}</span>
                      <span className="t-caption block text-ink-2">{o.pickupName}</span>
                    </span>
                    <StatusBadge tone={ORDER_TONE[o.status]}>{t(`order.status${o.status}`)}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
