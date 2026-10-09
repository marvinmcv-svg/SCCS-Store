import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatBs } from '@/lib/money';
import { formatDateTime, formatSlot } from '@/lib/dates';
import { QrCode } from '@/components/ui/qr-code';
import { getSettings, pickupLocation } from '@/lib/settings';
import { PrintButton } from './print-button';

/** Pick list (for staff preparing) + pickup slip (signed at handover). */
export default async function PrintOrder({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage('manageOrders');
  const t = await getTranslations();
  const [order, settings] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: { orderBy: { sku: 'asc' } }, pickupSlot: true } }), getSettings()]);
  if (!order) notFound();
  return (
    <div className="mx-auto max-w-3xl bg-white text-[#14142b] print:max-w-none">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton label={t('admin.common.print')} />
      </div>
      <section className="break-after-page rounded-[8px] p-8 ring-1 ring-[#e5e5e5] print:p-0 print:ring-0">
        <p className="font-mono text-[11px] tracking-widest uppercase">SCCS Store · {t('admin.orders.pickList')}</p>
        <h1 className="mt-2 text-[32px] font-medium tracking-tight">{order.code}</h1>
        <p className="text-[13px]">
          {order.name} · {order.phone} · {order.pickupSlot ? formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt, locale) : '—'}
        </p>
        <table className="mt-6 w-full text-[14px]">
          <thead>
            <tr className="border-b border-[#14142b] text-left">
              <th className="py-2">✓</th>
              <th className="py-2">{t('admin.orders.sku')}</th>
              <th className="py-2">{t('admin.products.name')}</th>
              <th className="py-2">{t('product.size')}</th>
              <th className="py-2">{t('admin.orders.qty')}</th>
              <th className="py-2">{t('admin.orders.student')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-[#e5e5e5]">
                <td className="py-2.5">
                  <span className="inline-block size-4 border border-[#14142b]" />
                </td>
                <td className="py-2.5 font-mono text-[12px]">{i.sku}</td>
                <td className="py-2.5">
                  {i.productName}
                  {i.preorder && ' (reserva)'}
                </td>
                <td className="py-2.5 font-medium">{i.size}</td>
                <td className="py-2.5">{i.qty}</td>
                <td className="py-2.5">{i.studentName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && <p className="mt-4 text-[13px]">📝 {order.notes}</p>}
      </section>

      <section className="mt-10 rounded-[8px] p-8 ring-1 ring-[#e5e5e5] print:mt-0 print:p-0 print:ring-0">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] tracking-widest uppercase">SCCS Store · {t('admin.orders.printSlip')}</p>
            <h2 className="mt-2 text-[28px] font-medium tracking-tight">{order.code}</h2>
            <p className="mt-2 text-[14px]">
              {t('admin.orders.pickupBy')}: <b>{order.pickupName}</b> · {order.pickupPhone}
            </p>
            <p className="text-[14px]">{pickupLocation(settings.store, locale)}</p>
            <p className="mt-2 text-[14px]">
              {t('bag.total')}: <b>{formatBs(order.totalCents)}</b> · {order.paymentMethod} · {t(`order.payStatus${order.paymentStatus}`)}
            </p>
          </div>
          <div className="w-32 shrink-0">
            <QrCode value={`SCCS:${order.pickupToken}`} label={order.code} className="p-0" />
          </div>
        </div>
        <ul className="mt-6 text-[14px]">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between border-b border-[#e5e5e5] py-1.5">
              <span>
                {i.qty}× {i.productName} · {i.size}
              </span>
              <span>{i.studentName}</span>
            </li>
          ))}
        </ul>
        <div className="mt-16 grid grid-cols-2 gap-10 text-[12px]">
          <div className="border-t border-[#14142b] pt-2">{t('admin.orders.signature')}</div>
          <div className="border-t border-[#14142b] pt-2">{t('admin.orders.printedAt', { date: formatDateTime(new Date(), locale) })}</div>
        </div>
      </section>
    </div>
  );
}
