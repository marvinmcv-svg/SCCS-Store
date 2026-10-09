import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Prisma } from '@prisma/client';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatBs } from '@/lib/money';
import { formatDateTime, formatSlot } from '@/lib/dates';
import { GRADES, gradeLabel } from '@/config/catalog';
import { PageHeader, Table, Th, Td, StatusBadge, ORDER_TONE, PAY_TONE, Empty } from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filter-bar';

export const metadata: Metadata = { title: 'Pedidos' };
const PER = 25;

export default async function AdminOrders({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requireAdminPage('manageOrders');
  const sp = await searchParams;
  const t = await getTranslations();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(sp.status ? { status: sp.status as Prisma.EnumOrderStatusFilter['equals'] } : {}),
    ...(sp.payment ? { paymentStatus: sp.payment as Prisma.EnumPaymentStatusFilter['equals'] } : {}),
    ...(sp.method ? { paymentMethod: sp.method as Prisma.EnumPaymentMethodFilter['equals'] } : {}),
    ...(sp.grade ? { items: { some: { studentGrade: sp.grade } } } : {}),
    ...(sp.from || sp.to ? { createdAt: { ...(sp.from ? { gte: new Date(`${sp.from}T00:00:00-04:00`) } : {}), ...(sp.to ? { lte: new Date(`${sp.to}T23:59:59-04:00`) } : {}) } } : {}),
    ...(sp.q
      ? {
          OR: [
            { code: { contains: sp.q, mode: 'insensitive' } },
            { name: { contains: sp.q, mode: 'insensitive' } },
            { email: { contains: sp.q, mode: 'insensitive' } },
            { phone: { contains: sp.q } },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER, include: { pickupSlot: true, _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER));
  const csvHref = `/api/admin/export/orders?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <>
      <PageHeader
        title={t('admin.orders.title')}
        description={t('admin.common.results', { count: total })}
        actions={
          <a href={csvHref} className="pressable inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset ring-line-strong hover:ring-ink">
            {t('admin.common.export')}
          </a>
        }
      />
      <FilterBar
        searchPlaceholder={t('admin.orders.searchPlaceholder')}
        filters={[
          { name: 'status', label: t('admin.orders.filterStatus'), options: ['RECEIVED', 'PAYMENT_VERIFIED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED', 'EXPIRED'].map((s) => ({ value: s, label: t(`order.status${s}` as 'order.statusREADY') })) },
          { name: 'payment', label: t('admin.orders.filterPayment'), options: ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'].map((s) => ({ value: s, label: t(`order.payStatus${s}` as 'order.payStatusPENDING') })) },
          { name: 'method', label: t('admin.orders.filterMethod'), options: ['QR', 'TRANSFER', 'CASH'].map((m) => ({ value: m, label: t(`checkout.method${m}` as 'checkout.methodQR') })) },
          { name: 'grade', label: t('admin.orders.grade'), options: GRADES.map((g) => ({ value: g, label: gradeLabel(g, locale) })) },
        ]}
      />
      {orders.length === 0 ? (
        <Empty title={t('admin.common.none')} body={t('admin.common.noneBody')} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('admin.orders.code')}</Th>
              <Th>{t('admin.orders.customer')}</Th>
              <Th>{t('admin.orders.placed')}</Th>
              <Th>{t('admin.orders.slot')}</Th>
              <Th>{t('admin.orders.method')}</Th>
              <Th>{t('admin.common.status')}</Th>
              <Th className="text-right">{t('admin.common.total')}</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-bg-subtle">
                <Td>
                  <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium underline-offset-4 hover:underline">
                    {o.code}
                  </Link>
                </Td>
                <Td>
                  <span className="block font-medium">{o.name}</span>
                  <span className="t-caption text-ink-2">{o.phone}</span>
                </Td>
                <Td className="t-caption whitespace-nowrap">{formatDateTime(o.createdAt, locale)}</Td>
                <Td className="t-caption">{o.pickupSlot ? formatSlot(o.pickupSlot.startsAt, o.pickupSlot.endsAt, locale) : '—'}</Td>
                <Td>
                  <span className="t-caption block">{o.paymentMethod}</span>
                  <StatusBadge tone={PAY_TONE[o.paymentStatus]}>{t(`order.payStatus${o.paymentStatus}` as 'order.payStatusPENDING')}</StatusBadge>
                </Td>
                <Td>
                  <StatusBadge tone={ORDER_TONE[o.status]}>{t(`order.status${o.status}` as 'order.statusREADY')}</StatusBadge>
                </Td>
                <Td className="tabular text-right font-medium">{formatBs(o.totalCents)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} pages={pages} label={t('admin.common.page', { page, pages })} />
    </>
  );
}
