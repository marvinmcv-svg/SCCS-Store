'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toaster';
import { updatePreferences } from '@/actions/students';

type Prefs = { name: string; phone: string; locale: 'es' | 'en'; notifyEmail: boolean; notifyWhatsapp: boolean };

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const t = useTranslations();
  const [v, setV] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await updatePreferences(v);
        setPending(false);
        if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
        toast(t('common.saved'));
      }}
    >
      <p className="t-label text-ink-2">{t('profile.account')}</p>
      <Field label={t('auth.name')} htmlFor="pref-name">
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" />
      </Field>
      <Field label={t('profile.phone')} htmlFor="pref-phone">
        <Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} autoComplete="tel" />
      </Field>
      <p className="t-label pt-4 text-ink-2">{t('profile.notifications')}</p>
      <Toggle label={t('profile.notifWhatsapp')} checked={v.notifyWhatsapp} onCheckedChange={(c) => setV({ ...v, notifyWhatsapp: c })} />
      <Toggle label={t('profile.notifEmail')} checked={v.notifyEmail} onCheckedChange={(c) => setV({ ...v, notifyEmail: c })} />
      <Button type="submit" variant="secondary" loading={pending}>
        {t('common.save')}
      </Button>
    </form>
  );
}
