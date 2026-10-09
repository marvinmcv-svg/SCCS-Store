import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { searchCatalog } from '@/actions/catalog';
import { SearchScreen } from './search-screen';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'search' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const q = ((await searchParams).q ?? '').slice(0, 80);
  const initial = q ? await searchCatalog(q, locale) : null;
  return <SearchScreen initialQuery={q} initial={initial} />;
}
