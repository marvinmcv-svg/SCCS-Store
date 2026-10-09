'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field, Input, Select } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { adjustStock, importStockCsv } from '@/actions/admin/catalog';

export function AdjustButton({ variantId, label, stock }: { variantId: string; label: string; stock: number }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [delta, setDelta] = React.useState('');
  const [reason, setReason] = React.useState<'PURCHASE' | 'ADJUSTMENT' | 'RETURN' | 'EXCHANGE' | 'DAMAGE'>('PURCHASE');
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const n = Number(delta);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {t('inventory.adjust')}
      </Button>
      <BottomSheet open={open} onOpenChange={setOpen} title={t('inventory.adjust')} description={label}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const res = await adjustStock({ variantId, delta: n, reason, note: note || undefined });
            setPending(false);
            if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
            toast(`${t('inventory.adjusted')} · ${res.data.stock}`);
            setOpen(false);
            setDelta('');
            setNote('');
            router.refresh();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('inventory.delta')} htmlFor="adj-delta" hint={Number.isInteger(n) && n !== 0 ? `${stock} → ${stock + n}` : undefined}>
              <Input inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))} placeholder="+10 / -2" required />
            </Field>
            <Field label={t('inventory.reason')} htmlFor="adj-reason">
              <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                {(['PURCHASE', 'ADJUSTMENT', 'RETURN', 'EXCHANGE', 'DAMAGE'] as const).map((r) => (
                  <option key={r} value={r}>
                    {t(`inventory.reason${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t('inventory.note')} htmlFor="adj-note">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" block loading={pending} disabled={!Number.isInteger(n) || n === 0 || stock + n < 0}>
            {t('common.save')}
          </Button>
        </form>
      </BottomSheet>
    </>
  );
}

export function ImportCsv() {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <>
      <Button variant="secondary" loading={pending} onClick={() => ref.current?.click()} title={t('inventory.importHint')}>
        {t('common.import')}
      </Button>
      <input
        ref={ref}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setPending(true);
          const fd = new FormData();
          fd.set('file', f);
          const res = await importStockCsv(fd);
          setPending(false);
          e.target.value = '';
          if (!res.ok) return toast.error(`${te(res.error as 'UNKNOWN')} — ${t('inventory.importHint')}`);
          toast(t('inventory.imported', { count: res.data.ok }) + (res.data.errors.length ? ` · ${t('inventory.importErrors', { count: res.data.errors.length })}: ${res.data.errors.slice(0, 3).join(', ')}` : ''));
          router.refresh();
        }}
      />
    </>
  );
}
