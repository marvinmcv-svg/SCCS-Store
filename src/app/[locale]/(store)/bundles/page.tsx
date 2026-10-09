import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getBundles } from '@/lib/catalog';
import { toBundleCards } from '@/lib/bundle-cards';
import { BundleCard } from '@/components/store/bundle-card';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'bundles' });
  return { title: t('title'), description: t('subtitle') };
}

export default async function BundlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('bundles');
  const cards = await toBundleCards(await getBundles(), locale);
  return (
    <div className="container-page pt-6 md:pt-12">
      <h1 className="t-h1">{t('title')}</h1>
      <p className="t-body mt-3 max-w-lg text-[17px] text-ink-2">{t('subtitle')}</p>
      <ul className="mt-10 grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((b, i) => (
          <li key={b.slug}>
            <BundleCard b={b} priority={i < 2} />
          </li>
        ))}
      </ul>
    </div>
  );
}
