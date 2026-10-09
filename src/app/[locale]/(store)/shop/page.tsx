import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShopView } from '@/components/store/shop/shop-view';
import type { ShopSearchParams } from '@/lib/shop-params';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'shop' });
  return { title: t('title') };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<ShopSearchParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ShopView locale={locale} sp={await searchParams} />;
}
