import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatSlot } from '@/lib/dates';
import { PageHeader, Table, Th, Td, StatusBadge } from '@/components/admin/ui';
import { SlotForms, SlotRowActions } from './slot-forms';

export const metadata: Metadata = { title: 'Horarios' };

export default async function SlotsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ past?: string }> }) {
  const { locale } = await params;
  await requireAdminPage('managePickups');
  const t = await getTranslations('admin');
  const past = (await searchParams).past === '1';
  const now = new Date();
  const slots = await db.pickupSlot.findMany({
    where: past ? { endsAt: { lt: now } } : { endsAt: { gte: now } },
    orderBy: { startsAt: past ? 'desc' : 'asc' },
    take: 100,
  });
  return (
    <>
      <PageHeader title={t('slots.title')} />
      <SlotForms />
      <div className="mt-8 mb-4 flex gap-2">
        <a href="?" className={`pressable inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium ring-1 ring-inset ${!past ? 'bg-ink text-bg ring-ink' : 'ring-line-strong'}`}>
          {t('slots.upcoming')}
        </a>
        <a href="?past=1" className={`pressable inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium ring-1 ring-inset ${past ? 'bg-ink text-bg ring-ink' : 'ring-line-strong'}`}>
          {t('slots.past')}
        </a>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{t('slots.date')}</Th>
            <Th>{t('slots.booked')}</Th>
            <Th>{t('slots.capacity')}</Th>
            <Th>{t('common.status')}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id} className={s.active ? '' : 'opacity-50'}>
              <Td>
                {formatSlot(s.startsAt, s.endsAt, locale)}
                {s.note && <span className="t-caption block text-ink-2">{s.note}</span>}
              </Td>
              <Td className="tabular">{s.booked}</Td>
              <Td className="tabular">{s.capacity}</Td>
              <Td>{s.booked >= s.capacity ? <StatusBadge tone="red">{t('slots.full')}</StatusBadge> : <StatusBadge tone={s.active ? 'success' : 'subtle'}>{s.active ? t('common.active') : t('common.inactive')}</StatusBadge>}</Td>
              <Td className="text-right">{!past && <SlotRowActions id={s.id} capacity={s.capacity} active={s.active} />}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
