import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/session';
import { LoginForm } from './login-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'auth' });
  return { title: t('signIn'), robots: { index: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; sent?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect({ href: sp.callbackUrl?.startsWith('/') ? sp.callbackUrl : user.role === 'CUSTOMER' ? '/profile' : '/admin', locale });
  return (
    <div className="container-page flex justify-center py-10 md:py-20">
      <LoginForm callbackUrl={sp.callbackUrl} sent={sp.sent === '1'} error={!!sp.error} />
    </div>
  );
}
