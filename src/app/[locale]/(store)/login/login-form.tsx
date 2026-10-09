'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { magicLinkAction, passwordLoginAction } from '@/actions/auth';

const schema = z.object({ email: z.string().trim().email('invalidEmail'), password: z.string().optional() });
type Values = z.infer<typeof schema>;

export function LoginForm({ callbackUrl, sent: initialSent, error }: { callbackUrl?: string; sent?: boolean; error?: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [mode, setMode] = React.useState<'password' | 'magic'>('password');
  const [sent, setSent] = React.useState(!!initialSent);
  const [formError, setFormError] = React.useState<string | null>(error ? t('errors.INVALID_CREDENTIALS') : null);
  const { register, handleSubmit, formState, getValues } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Values) {
    setFormError(null);
    if (mode === 'magic') {
      const res = await magicLinkAction({ email: v.email, callbackUrl });
      if (!res.ok) return setFormError(t(`errors.${res.error}` as 'errors.UNKNOWN'));
      setSent(true);
      return;
    }
    if (!v.password) return setFormError(t('errors.required'));
    const res = await passwordLoginAction({ email: v.email, password: v.password, callbackUrl });
    if (!res.ok) return setFormError(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    router.replace(res.data.redirectTo);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center animate-fade-up">
        <p className="t-label text-ink-2">SCCS Store</p>
        <h1 className="t-h2 mt-3">{t('auth.magicLinkTitle')}</h1>
        <p className="t-body mt-3 text-ink-2">{t('auth.magicLinkBody')}</p>
        {getValues('email') && <p className="t-body mt-2 font-medium">{getValues('email')}</p>}
        <Button variant="secondary" className="mt-8" onClick={() => setSent(false)}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm" noValidate>
      <p className="t-label text-ink-2">SCCS Store</p>
      <h1 className="t-h1 mt-3">{t('auth.signInTitle')}</h1>
      <div className="mt-8 space-y-4">
        <Field label={t('auth.email')} htmlFor="email" error={formState.errors.email && t(`errors.${formState.errors.email.message}` as 'errors.invalidEmail')}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        {mode === 'password' && (
          <Field label={t('auth.password')} htmlFor="password">
            <Input type="password" autoComplete="current-password" {...register('password')} />
          </Field>
        )}
        {formError && (
          <p role="alert" className="t-caption rounded-[10px] bg-red-soft px-4 py-3 text-red">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={formState.isSubmitting}>
          {mode === 'password' ? t('auth.signIn') : t('auth.magicLink')}
        </Button>
        <Button type="button" variant="ghost" size="lg" block onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}>
          {mode === 'password' ? t('auth.useMagicLink') : t('auth.usePassword')}
        </Button>
      </div>
      <p className="t-body mt-10 text-center text-ink-2">
        {t('auth.noAccount')}{' '}
        <Link href={{ pathname: '/register', query: callbackUrl ? { callbackUrl } : {} }} className="font-medium text-ink underline underline-offset-4">
          {t('auth.signUp')}
        </Link>
      </p>
    </form>
  );
}
