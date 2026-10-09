import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { routing } from '@/i18n/routing';
import { Providers } from '@/components/providers';
import { school } from '@/config/school';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    metadataBase: new URL(base),
    title: { default: t('title'), template: `%s · ${school.storeName}` },
    description: t('description'),
    applicationName: school.storeName,
    appleWebApp: { capable: true, title: school.storeName, statusBarStyle: 'default' },
    icons: {
      icon: [
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
    alternates: { languages: { es: '/', en: '/en' } },
    openGraph: { title: t('title'), description: t('description'), siteName: school.storeName, locale },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
