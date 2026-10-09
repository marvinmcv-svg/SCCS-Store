'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { lookupOrder } from '@/actions/orders';

export function LookupForm() {
  const t = useTranslations();
  const router = useRouter();
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <form
      className="w-full max-w-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        const res = await lookupOrder({ code, email });
        setPending(false);
        if (!res.ok) return setError(res.error === 'RATE_LIMITED' ? t('errors.RATE_LIMITED') : t('order.lookupNotFound'));
        router.push(`/orders/${res.data.code}?t=${res.data.token}`);
      }}
    >
      <h1 className="t-h1">{t('order.lookupTitle')}</h1>
      <p className="t-body mt-3 text-ink-2">{t('order.lookupBody')}</p>
      <div className="mt-8 space-y-4">
        <Field label={t('order.code')} htmlFor="code">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SC-7K2Q9" autoCapitalize="characters" required className="font-mono" />
        </Field>
        <Field label={t('auth.email')} htmlFor="lookup-email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {error && (
          <p role="alert" className="t-caption text-red">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block loading={pending}>
          {t('order.lookupCta')}
        </Button>
      </div>
    </form>
  );
}
