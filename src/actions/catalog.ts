'use server';

import { z } from 'zod';
import { listProducts, getBundles, matchesQuery, toCard, bundlePricing } from '@/lib/catalog';
import { cardLabels } from '@/lib/card-labels';
import { loc } from '@/lib/utils';
import { formatBs } from '@/lib/money';
import { parseShopParams } from '@/lib/shop-params';

/** Live result count for the filter sheet's "Show N products" button. */
export async function countProducts(params: Record<string, string>, category?: string) {
  const f = parseShopParams(params, category);
  let list = await listProducts(f);
  if (f.garments.length) list = list.filter((p) => p.garmentType && f.garments.includes(p.garmentType));
  return list.length;
}

/** Instant search (debounced on the client). */
export async function searchCatalog(q: string, locale: string) {
  const query = z.string().trim().max(80).parse(q);
  if (query.length < 2) return { products: [], bundles: [] };
  const [products, bundles, labels] = await Promise.all([listProducts({ q: query }), getBundles(), cardLabels()]);
  const lang = locale === 'en' ? 'en' : 'es';
  return {
    products: products.slice(0, 12).map((p) => toCard(p, lang, labels)),
    bundles: bundles
      .filter((b) => {
        const hay = `${b.nameEs} ${b.nameEn} ${b.descEs} ${b.descEn}`.toLowerCase();
        return query
          .toLowerCase()
          .split(/\s+/)
          .every((t) => hay.includes(t)) || b.items.some((i) => matchesQuery(i.product, query));
      })
      .slice(0, 4)
      .map((b) => ({ slug: b.slug, name: loc(b, 'name', lang), image: b.image, price: formatBs(bundlePricing(b).total) })),
  };
}
