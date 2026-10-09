import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCartView } from '@/lib/cart';
import { getSettings, pickupLocation } from '@/lib/settings';
import { BagScreen } from './bag-screen';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'bag' });
  return { title: t('title'), robots: { index: false } };
}

export default async function BagPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [view, settings] = await Promise.all([getCartView(locale), getSettings()]);
  return <BagScreen initial={view} location={pickupLocation(settings.store, locale)} />;
}
