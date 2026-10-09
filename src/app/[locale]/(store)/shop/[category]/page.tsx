import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getCategories } from '@/lib/catalog';
import { ShopView } from '@/components/store/shop/shop-view';
import type { ShopSearchParams } from '@/lib/shop-params';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  const c = (await getCategories()).find((x) => x.slug === category);
  return { title: c ? (locale === 'en' ? c.nameEn : c.nameEs) : undefined };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<ShopSearchParams>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  if (!(await getCategories()).some((c) => c.slug === category)) notFound();
  return <ShopView locale={locale} sp={await searchParams} category={category} />;
}
