'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { registerAction } from '@/actions/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'required'),
  email: z.string().trim().email('invalidEmail'),
  phone: z
    .string()
    .trim()
    .refine((v) => /^[67]\d{7}$/.test(v.replace(/[^\d]/g, '').replace(/^591/, '')), 'invalidPhone'),
  password: z.string().min(8, 'passwordShort'),
});
type Values = z.infer<typeof schema>;

export function RegisterForm({ callbackUrl, email }: { callbackUrl?: string; email?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: email ?? '' },
  });
  const err = (k: keyof Values) => {
    const m = formState.errors[k]?.message;
    return m ? t(`errors.${m}` as 'errors.required') : undefined;
  };

  async function onSubmit(v: Values) {
    setFormError(null);
    const res = await registerAction({ ...v, locale: locale as 'es' | 'en', callbackUrl });
    if (!res.ok) {
      if (res.fields) for (const [k, m] of Object.entries(res.fields)) setError(k as keyof Values, { message: m });
      return setFormError(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    }
    router.replace(res.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm" noValidate>
      <p className="t-label text-ink-2">SCCS Store</p>
      <h1 className="t-h1 mt-3">{t('auth.signUpTitle')}</h1>
      <div className="mt-8 space-y-4">
        <Field label={t('auth.name')} htmlFor="name" error={err('name')}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field label={t('auth.email')} htmlFor="email" error={err('email')}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field label={t('auth.phone')} htmlFor="phone" error={err('phone')} hint={t('checkout.phoneHint')}>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="7xxxxxxx" {...register('phone')} />
        </Field>
        <Field label={t('auth.password')} htmlFor="password" error={err('password')} hint={t('auth.passwordHint')}>
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        {formError && (
          <p role="alert" className="t-caption rounded-[10px] bg-red-soft px-4 py-3 text-red">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" block loading={formState.isSubmitting}>
          {t('auth.signUp')}
        </Button>
        <p className="t-caption text-center text-ink-2">{t('auth.terms')}</p>
      </div>
      <p className="t-body mt-10 text-center text-ink-2">
        {t('auth.haveAccount')}{' '}
        <Link href={{ pathname: '/login', query: callbackUrl ? { callbackUrl } : {} }} className="font-medium text-ink underline underline-offset-4">
          {t('auth.signIn')}
        </Link>
      </p>
    </form>
  );
}
