'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { requestExchange } from '@/actions/orders';
import { ALL_SIZES } from '@/config/catalog';

export function ExchangeButton({ code, token, orderItemId, productName, days }: { code: string; token: string | null; orderItemId: string; productName: string; days: number }) {
  const t = useTranslations('order');
  const te = useTranslations('errors');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState<'SIZE' | 'DEFECT' | 'OTHER'>('SIZE');
  const [size, setSize] = React.useState('');
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="t-caption mt-2 font-medium underline underline-offset-4">
        {t('requestExchange')}
      </button>
      <BottomSheet open={open} onOpenChange={setOpen} title={t('exchangeTitle')} description={`${productName} · ${t('exchangeBody', { days })}`}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const res = await requestExchange({ code, token, orderItemId, reason, desiredSize: size || undefined, note: note || undefined });
            setPending(false);
            if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
            toast(t('exchangeSent'));
            setOpen(false);
            router.refresh();
          }}
        >
          <Field label={t('exchangeReason')} htmlFor="ex-reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {(['SIZE', 'DEFECT', 'OTHER'] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`exchangeReason${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          {reason === 'SIZE' && (
            <Field label={t('exchangeSize')} htmlFor="ex-size">
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="">—</option>
                {ALL_SIZES.filter((s) => s !== 'U').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t('exchangeNote')} htmlFor="ex-note">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Input type="hidden" value={orderItemId} readOnly />
          <Button type="submit" size="lg" block loading={pending}>
            {t('exchangeSubmit')}
          </Button>
        </form>
      </BottomSheet>
    </>
  );
}
