import 'server-only';
import { getTranslations } from 'next-intl/server';
import { bundlePricing, gradesSummary, type BundleWithRelations } from '@/lib/catalog';
import { loc } from '@/lib/utils';
import type { BundleCardData } from '@/components/store/bundle-card';

export async function toBundleCards(bundles: BundleWithRelations[], locale: string): Promise<BundleCardData[]> {
  const t = await getTranslations('bundles');
  const tp = await getTranslations('product');
  return bundles.map((b) => {
    const p = bundlePricing(b);
    return {
      slug: b.slug,
      name: loc(b, 'name', locale),
      grades: gradesSummary(b.grades, locale, tp('allGrades')),
      image: b.image,
      blur: b.imageBlur,
      totalCents: p.total,
      subtotalCents: p.subtotal,
      discountPct: b.discountPct,
      pieces: t('items', { count: p.pieces }),
      saveLabel: t('save', { pct: b.discountPct }),
    };
  });
}
