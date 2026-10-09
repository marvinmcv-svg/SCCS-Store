'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { toast } from '@/components/ui/toaster';
import { Card } from '@/components/admin/ui';
import { createSlot, createSlotsBulk, updateSlot } from '@/actions/admin/store';

const DAYS = [
  { d: 1, k: 'mon' },
  { d: 2, k: 'tue' },
  { d: 3, k: 'wed' },
  { d: 4, k: 'thu' },
  { d: 5, k: 'fri' },
  { d: 6, k: 'sat' },
] as const;

export function SlotForms() {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [one, setOne] = React.useState({ date: '', start: '07:15', end: '08:15', capacity: '20', note: '' });
  const [bulk, setBulk] = React.useState({ from: '', to: '', start: '13:00', end: '14:00', capacity: '20', weekdays: [2, 4] as number[] });
  const [pending, setPending] = React.useState<string | null>(null);

  const done = (res: { ok: boolean; error?: string; data?: { count: number } | null }) => {
    setPending(null);
    if (!res.ok) return toast.error(te((res.error ?? 'UNKNOWN') as 'UNKNOWN'));
    toast(t('slots.created', { count: res.data?.count ?? 1 }));
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={t('slots.new')}>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending('one');
            done(await createSlot({ ...one, capacity: Number(one.capacity) }));
          }}
        >
          <Field label={t('slots.date')} htmlFor="s-date" className="col-span-2">
            <Input type="date" value={one.date} onChange={(e) => setOne({ ...one, date: e.target.value })} required className="bg-bg" />
          </Field>
          <Field label={t('slots.start')} htmlFor="s-start">
            <Input type="time" value={one.start} onChange={(e) => setOne({ ...one, start: e.target.value })} className="bg-bg" />
          </Field>
          <Field label={t('slots.end')} htmlFor="s-end">
            <Input type="time" value={one.end} onChange={(e) => setOne({ ...one, end: e.target.value })} className="bg-bg" />
          </Field>
          <Field label={t('slots.capacity')} htmlFor="s-cap">
            <Input inputMode="numeric" value={one.capacity} onChange={(e) => setOne({ ...one, capacity: e.target.value.replace(/\D/g, '') })} className="bg-bg" />
          </Field>
          <Field label={t('slots.note')} htmlFor="s-note">
            <Input value={one.note} onChange={(e) => setOne({ ...one, note: e.target.value })} className="bg-bg" />
          </Field>
          <Button type="submit" className="col-span-2" loading={pending === 'one'}>
            {t('common.create')}
          </Button>
        </form>
      </Card>
      <Card title={t('slots.bulk')}>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending('bulk');
            done(await createSlotsBulk({ ...bulk, capacity: Number(bulk.capacity) }));
          }}
        >
          <Field label={t('slots.fromDate')} htmlFor="b-from">
            <Input type="date" value={bulk.from} onChange={(e) => setBulk({ ...bulk, from: e.target.value })} required className="bg-bg" />
          </Field>
          <Field label={t('slots.toDate')} htmlFor="b-to">
            <Input type="date" value={bulk.to} onChange={(e) => setBulk({ ...bulk, to: e.target.value })} required className="bg-bg" />
          </Field>
          <div className="col-span-2">
            <p className="t-label mb-2 text-ink-2">{t('slots.weekdays')}</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Chip key={d.d} type="button" size="sm" selected={bulk.weekdays.includes(d.d)} onClick={() => setBulk({ ...bulk, weekdays: bulk.weekdays.includes(d.d) ? bulk.weekdays.filter((x) => x !== d.d) : [...bulk.weekdays, d.d] })}>
                  {t(`slots.${d.k}`)}
                </Chip>
              ))}
            </div>
          </div>
          <Field label={t('slots.start')} htmlFor="b-start">
            <Input type="time" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} className="bg-bg" />
          </Field>
          <Field label={t('slots.end')} htmlFor="b-end">
            <Input type="time" value={bulk.end} onChange={(e) => setBulk({ ...bulk, end: e.target.value })} className="bg-bg" />
          </Field>
          <Field label={t('slots.capacity')} htmlFor="b-cap">
            <Input inputMode="numeric" value={bulk.capacity} onChange={(e) => setBulk({ ...bulk, capacity: e.target.value.replace(/\D/g, '') })} className="bg-bg" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" block loading={pending === 'bulk'}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function SlotRowActions({ id, capacity, active }: { id: string; capacity: number; active: boolean }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [cap, setCap] = React.useState(String(capacity));
  const save = async (patch: { capacity?: number; active?: boolean }) => {
    const res = await updateSlot(id, patch);
    if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
    toast(t('slots.saved'));
    router.refresh();
  };
  return (
    <span className="inline-flex items-center gap-2">
      <input inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ''))} onBlur={() => Number(cap) !== capacity && save({ capacity: Number(cap) })} className="h-9 w-16 rounded-[8px] bg-bg-subtle px-2 text-center tabular" aria-label={t('slots.capacity')} />
      <Button size="sm" variant="ghost" onClick={() => save({ active: !active })}>
        {active ? t('slots.deactivate') : t('slots.activate')}
      </Button>
    </span>
  );
}
