import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { PageHeader, StatusBadge, Empty } from '@/components/admin/ui';
import { ExchangeActions } from './exchange-actions';

export const metadata: Metadata = { title: 'Cambios' };

export default async function ExchangesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage('manageOrders');
  const t = await getTranslations();
  const list = await db.exchangeRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: { orderItem: { include: { order: { select: { id: true, code: true, name: true, phone: true } } } } },
  });
  return (
    <>
      <PageHeader title={t('admin.exchanges.title')} />
      {list.length === 0 ? (
        <Empty title={t('admin.common.none')} />
      ) : (
        <ul className="space-y-3">
          {list.map((x) => (
            <li key={x.id} className="rounded-[14px] bg-bg-subtle p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="t-title">
                    {x.orderItem.productName} · {x.orderItem.size}
                    {x.desiredSize && <span className="text-accent"> → {x.desiredSize}</span>}
                  </p>
                  <p className="t-caption text-ink-2">
                    <Link href={`/admin/orders/${x.orderItem.order.id}`} className="font-mono underline underline-offset-4">
                      {x.orderItem.order.code}
                    </Link>{' '}
                    · {x.orderItem.order.name} · {x.orderItem.order.phone} · {formatDateTime(x.createdAt, locale)}
                  </p>
                  <p className="t-body mt-2">
                    {t(`order.exchangeReason${x.reason}` as 'order.exchangeReasonSIZE')}
                    {x.note && <span className="text-ink-2"> — {x.note}</span>}
                  </p>
                  {x.resolution && <p className="t-caption mt-1 text-ink-2">↳ {x.resolution}</p>}
                </div>
                <StatusBadge tone={x.status === 'REQUESTED' ? 'warning' : x.status === 'APPROVED' ? 'accentSoft' : x.status === 'COMPLETED' ? 'success' : 'red'}>{t(`order.exchangeStatus${x.status}`)}</StatusBadge>
              </div>
              {(x.status === 'REQUESTED' || x.status === 'APPROVED') && <ExchangeActions id={x.id} status={x.status} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
