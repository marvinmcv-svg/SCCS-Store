import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getBundleBySlug, gradesSummary } from '@/lib/catalog';
import { availability } from '@/lib/stock';
import { findCart } from '@/lib/cart';
import { loc } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BundleBuilder } from './bundle-builder';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const b = await getBundleBySlug(slug);
  return b ? { title: loc(b, 'name', locale), description: loc(b, 'desc', locale) } : {};
}

export default async function BundlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const bundle = await getBundleBySlug(slug);
  if (!bundle) notFound();
  const t = await getTranslations();
  const cart = await findCart();
  const avail = await availability(
    bundle.items.flatMap((i) => i.product.variants.map((v) => v.id)),
    cart?.id,
  );

  return (
    <div className="md:container-page md:grid md:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)] md:gap-12 md:pt-8 lg:gap-16">
      <div className="relative aspect-[4/5] bg-bg-subtle md:sticky md:top-24 md:self-start md:rounded-[3px]">
        {bundle.image && (
          <Image src={bundle.image} alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" placeholder={bundle.imageBlur ? 'blur' : 'empty'} blurDataURL={bundle.imageBlur ?? undefined} className="object-cover md:rounded-[3px]" />
        )}
      </div>
      <div className="container-page pt-6 pb-40 md:px-0 md:pt-0 md:pb-0">
        <Badge tone="accent">{t('bundles.save', { pct: bundle.discountPct })}</Badge>
        <h1 className="t-h2 mt-3">{loc(bundle, 'name', locale)}</h1>
        <p className="t-caption mt-2 text-ink-2">
          {t('bundles.for')} {gradesSummary(bundle.grades, locale, t('product.allGrades'))}
        </p>
        <p className="t-body mt-4 text-ink-2">{loc(bundle, 'desc', locale)}</p>
        <BundleBuilder
          bundleId={bundle.id}
          discountPct={bundle.discountPct}
          items={bundle.items.map((i) => ({
            productId: i.productId,
            name: loc(i.product, 'name', locale),
            slug: i.product.slug,
            image: i.product.images[0]?.url ?? null,
            blur: i.product.images[0]?.blur ?? null,
            qty: i.qty,
            optional: i.optional,
            garmentType: i.product.garmentType,
            allowPreorder: i.product.allowPreorder,
            variants: i.product.variants.map((v) => ({ id: v.id, size: v.size, priceCents: v.priceCents, available: avail[v.id] ?? 0 })),
          }))}
        />
      </div>
    </div>
  );
}
