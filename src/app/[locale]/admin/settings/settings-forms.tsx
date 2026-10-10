'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { Card } from '@/components/admin/ui';
import type { PaymentSettings, StoreSettings } from '@/lib/settings';
import { savePaymentSettings, saveStoreSettings, uploadQrImage } from '@/actions/admin/store';

export function PaymentSettingsForm({ initial }: { initial: PaymentSettings }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const te = useTranslations('errors');
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  return (
    <Card title={t('payments')}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await savePaymentSettings(v);
          setPending(false);
          if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
          toast(t('saved'));
          router.refresh();
        }}
      >
        <div className="flex items-start gap-4">
          <label className="pressable relative block size-36 shrink-0 cursor-pointer overflow-hidden rounded-[12px] bg-white ring-1 ring-line ring-inset">
            <Image src={v.qrImage} alt={t('qr')} fill sizes="144px" className="object-contain p-2" unoptimized={v.qrImage.endsWith('.svg')} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.set('file', f);
                const res = await uploadQrImage(fd);
                if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
                setV({ ...v, qrImage: res.data.url });
              }}
            />
          </label>
          <div>
            <p className="t-body font-medium">{t('qr')}</p>
            <p className="t-caption text-ink-2">{t('qrHint')}</p>
          </div>
        </div>
        <Button type="submit" loading={pending}>{tc('save')}</Button>
      </form>
    </Card>
  );
}

export function StoreSettingsForm({ initial }: { initial: StoreSettings }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const te = useTranslations('errors');
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const inp = (k: keyof StoreSettings) => ({ value: String(v[k]), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }), className: 'bg-bg' });
  return (
    <Card title={t('store')}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await saveStoreSettings({ ...v, exchangeDays: Number(v.exchangeDays), payAtSchoolHoldDays: Number(v.payAtSchoolHoldDays) });
          setPending(false);
          if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
          toast(t('saved'));
          router.refresh();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('whatsapp')} htmlFor="ss-wa"><Input {...inp('whatsapp')} inputMode="tel" /></Field>
          <Field label={t('storeEmail')} htmlFor="ss-email"><Input {...inp('storeEmail')} type="email" /></Field>
          <Field label={t('pickupLocationEs')} htmlFor="ss-ples"><Input {...inp('pickupLocationEs')} /></Field>
          <Field label={t('pickupLocationEn')} htmlFor="ss-plen"><Input {...inp('pickupLocationEn')} /></Field>
          <Field label={t('exchangeDays')} htmlFor="ss-ex"><Input {...inp('exchangeDays')} inputMode="numeric" /></Field>
        </div>
        <Button type="submit" loading={pending}>{tc('save')}</Button>
      </form>
    </Card>
  );
}
