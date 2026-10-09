import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getActiveProducts, getBundles, getProductBySlug, gradesSummary, toCard } from '@/lib/catalog';
import { availability } from '@/lib/stock';
import { findCart } from '@/lib/cart';
import { cardLabels } from '@/lib/card-labels';
import { toBundleCards } from '@/lib/bundle-cards';
import { getSettings, pickupLocation } from '@/lib/settings';
import { loc } from '@/lib/utils';
import { SIZED_GARMENTS, type GarmentType } from '@/config/catalog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Gallery } from '@/components/store/pdp/gallery';
import { Purchase } from '@/components/store/pdp/purchase';
import { ProductRail } from '@/components/store/product-rail';
import { BundleCard } from '@/components/store/bundle-card';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const name = loc(p, 'name', locale);
  return {
    title: name,
    description: loc(p, 'desc', locale).slice(0, 160),
    openGraph: { title: name, images: p.images[0] ? [{ url: p.images[0].url }] : [] },
    alternates: { languages: { es: `/p/${slug}`, en: `/en/p/${slug}` } },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [t, cart, labels, all, bundles, settings] = await Promise.all([getTranslations(), findCart(), cardLabels(), getActiveProducts(), getBundles(), getSettings()]);
  // Live (uncached) availability so the size grid never lies.
  const avail = await availability(
    product.variants.map((v) => v.id),
    cart?.id,
  );
  const name = loc(product, 'name', locale);
  const sized = !!product.garmentType && SIZED_GARMENTS.includes(product.garmentType as GarmentType) && product.variants.some((v) => v.size !== 'U');

  const related = all
    .filter((p) => p.id !== product.id && p.isUniform && p.garmentType !== product.garmentType)
    .filter((p) => !product.grades.length || !p.grades.length || p.grades.some((g) => product.grades.includes(g)))
    .slice(0, 10)
    .map((p) => toCard(p, locale, labels));
  const inBundles = await toBundleCards(
    bundles.filter((b) => b.items.some((i) => i.productId === product.id)),
    locale,
  );

  const prices = product.variants.map((v) => v.priceCents);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: loc(product, 'desc', locale),
    image: product.images.map((i) => i.url),
    brand: { '@type': 'Brand', name: 'Santa Cruz Cooperative School' },
    sku: product.variants[0]?.sku,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BOB',
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      availability: Object.values(avail).some((n) => n > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="md:container-page md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] md:gap-10 md:pt-8 lg:gap-16">
        <div>
          <Gallery images={product.images.map((i) => ({ url: i.url, blur: i.blur, alt: i.alt }))} name={name} slug={product.slug} />
        </div>
        <div className="container-page pt-6 pb-36 md:sticky md:top-24 md:self-start md:px-0 md:pt-0 md:pb-0">
          <nav aria-label="breadcrumb" className="t-caption mb-3 text-ink-2">
            <Link href="/shop" className="hover:text-ink">
              {t('nav.shop')}
            </Link>
            <span aria-hidden> / </span>
            <Link href={`/shop/${product.category.slug}`} className="hover:text-ink">
              {loc(product.category, 'name', locale)}
            </Link>
          </nav>
          <div className="flex flex-wrap gap-1.5">
            {product.isUniform && <Badge tone="accentSoft">{t('product.official')}</Badge>}
            {product.isNew && <Badge tone="gold">{t('product.new')}</Badge>}
          </div>
          <h1 className="t-h2 mt-3">{name}</h1>
          <p className="t-caption mt-2 text-ink-2">{product.grades.length ? t('product.for', { grades: gradesSummary(product.grades, locale, '') }) : t('product.allGrades')}</p>
          <div className="mt-6">
            <Purchase
              productId={product.id}
              productName={name}
              garmentType={product.garmentType}
              allowPreorder={product.allowPreorder}
              preorderDate={product.preorderDate ? new Date(product.preorderDate).toISOString() : null}
              sized={sized}
              variants={product.variants.map((v) => ({
                id: v.id,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                priceCents: v.priceCents,
                compareAtCents: v.compareAtCents,
                available: avail[v.id] ?? 0,
              }))}
            />
          </div>
          <Accordion type="multiple" defaultValue={['details']} className="mt-8 border-t border-line">
            <AccordionItem value="details" title={t('product.details')}>
              <p className="whitespace-pre-line">{loc(product, 'desc', locale)}</p>
              <p className="t-label mt-4 text-ink-3">
                {t('product.sku')} {product.variants[0]?.sku.replace(/-[^-]+$/, '')}
              </p>
            </AccordionItem>
            <AccordionItem value="care" title={t('product.material')}>
              <p>{loc(product, 'care', locale)}</p>
            </AccordionItem>
            {product.isUniform && (
              <AccordionItem value="policy" title={t('product.uniformPolicy')}>
                <p>{t('product.uniformPolicyBody')}</p>
                <Link href="/info/uniform-policy" className="mt-2 inline-block font-medium text-ink underline underline-offset-4">
                  {t('footer.uniformPolicy')}
                </Link>
              </AccordionItem>
            )}
            <AccordionItem value="pickup" title={t('product.pickupExchanges')}>
              <p>{t('product.pickupExchangesBody', { location: pickupLocation(settings.store, locale), days: settings.store.exchangeDays })}</p>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {inBundles.length > 0 && (
        <section className="container-page pt-12" aria-label={t('bundles.title')}>
          <h2 className="t-h2 mb-6">{t('bundles.title')}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
            {inBundles.map((b) => (
              <BundleCard key={b.slug} b={b} />
            ))}
          </div>
        </section>
      )}
      <ProductRail title={t('product.completeLook')} products={related} morphIds={new Set()} />
    </>
  );
}
