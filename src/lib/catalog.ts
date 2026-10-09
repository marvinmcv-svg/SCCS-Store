import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { loc } from '@/lib/utils';
import { DIVISIONS, gradeLabel } from '@/config/catalog';
import type { ProductCardData } from '@/components/store/product-card';

/**
 * Catalog reads are cached (ISR-style) under the `catalog` tag and
 * invalidated whenever the admin changes products, stock, bundles or
 * content (see lib/revalidate.ts). Live stock for the PDP size grid is read
 * uncached in lib/stock.ts.
 *
 * NOTE: unstable_cache round-trips through JSON, so Date fields on cached
 * results arrive as ISO strings. Always wrap them with `new Date()`.
 */
export const CATALOG_TAG = 'catalog';
const CACHE = { tags: [CATALOG_TAG], revalidate: 300 };

const productInclude = {
  images: { orderBy: { sort: 'asc' } },
  variants: { where: { active: true }, orderBy: [{ sizeSort: 'asc' }] },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export type Labels = { new: string; soldOut: string; preorder: string; from?: string };

export function gradesSummary(grades: string[], locale: string, allLabel: string) {
  if (!grades.length) return allLabel;
  const divs = DIVISIONS.filter((d) => d.grades.every((g) => grades.includes(g)));
  const covered = new Set(divs.flatMap((d) => d.grades as string[]));
  const rest = grades.filter((g) => !covered.has(g));
  const parts = [...divs.map((d) => (locale === 'en' ? d.en : d.es)), ...rest.map((g) => gradeLabel(g, locale))];
  return parts.join(' · ');
}

export function toCard(p: ProductWithRelations, locale: string, labels: Labels): ProductCardData {
  const prices = p.variants.map((v) => v.priceCents);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const cheapest = p.variants.find((v) => v.priceCents === min);
  const inStock = p.variants.some((v) => v.stock > 0);
  const colors = [...new Set(p.variants.map((v) => v.colorHex))];
  let badge: ProductCardData['badge'] = null;
  if (!inStock && !p.allowPreorder) badge = { label: labels.soldOut, tone: 'subtle' };
  else if (!inStock && p.allowPreorder) badge = { label: labels.preorder, tone: 'warning' };
  else if (p.isNew) badge = { label: labels.new, tone: 'gold' };
  return {
    id: p.id,
    slug: p.slug,
    name: loc(p, 'name', locale),
    subtitle: locale === 'en' ? p.category.nameEn : p.category.nameEs,
    priceCents: min,
    compareAtCents: cheapest?.compareAtCents ?? null,
    fromPrice: max > min,
    images: p.images.slice(0, 2).map((i) => ({ url: i.url, blur: i.blur, alt: i.alt })),
    colors,
    badge,
  };
}

export const getCategories = unstable_cache(
  async () => db.category.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { products: { where: { status: 'ACTIVE' } } } } } }),
  ['categories'],
  CACHE,
);

export type ProductFilters = {
  category?: string;
  grades?: string[];
  fit?: string[];
  sizes?: string[];
  inStock?: boolean;
  maxPrice?: number;
  sort?: 'featured' | 'new' | 'price-asc' | 'price-desc';
  q?: string;
};

/** All active products with relations; filtering happens in memory (catalog is small, ~100s). */
export const getActiveProducts = unstable_cache(
  async () =>
    db.product.findMany({
      where: { status: 'ACTIVE' },
      include: productInclude,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    }),
  ['active-products'],
  CACHE,
);

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function matchesQuery(p: ProductWithRelations, q: string) {
  const hay = normalize([p.nameEs, p.nameEn, p.descEs, p.descEn, p.category.nameEs, p.category.nameEn, ...p.tags].join(' '));
  return normalize(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term) || (term.length > 3 && hay.includes(term.slice(0, -1))));
}

export async function listProducts(f: ProductFilters) {
  let list = await getActiveProducts();
  if (f.category) list = list.filter((p) => p.category.slug === f.category);
  if (f.grades?.length) list = list.filter((p) => !p.grades.length || p.grades.some((g) => f.grades!.includes(g)));
  if (f.fit?.length) list = list.filter((p) => p.fit === 'UNISEX' || f.fit!.includes(p.fit));
  if (f.sizes?.length) list = list.filter((p) => p.variants.some((v) => f.sizes!.includes(v.size) && (v.stock > 0 || p.allowPreorder)));
  if (f.inStock) list = list.filter((p) => p.variants.some((v) => v.stock > 0));
  if (f.maxPrice) list = list.filter((p) => Math.min(...p.variants.map((v) => v.priceCents)) <= f.maxPrice!);
  if (f.q) list = list.filter((p) => matchesQuery(p, f.q!));
  const minPrice = (p: ProductWithRelations) => Math.min(...p.variants.map((v) => v.priceCents));
  switch (f.sort) {
    case 'new':
      list = [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew) || +new Date(b.createdAt) - +new Date(a.createdAt));
      break;
    case 'price-asc':
      list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      break;
    case 'price-desc':
      list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      break;
    default:
      list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort - b.sort);
  }
  return list;
}

export const getProductBySlug = unstable_cache(
  async (slug: string) =>
    db.product.findFirst({
      where: { slug, status: 'ACTIVE' },
      include: { ...productInclude, bundleItems: { include: { bundle: true } } },
    }),
  ['product-by-slug'],
  CACHE,
);

const bundleInclude = {
  items: {
    orderBy: { sort: 'asc' },
    include: { product: { include: productInclude } },
  },
} satisfies Prisma.BundleInclude;
export type BundleWithRelations = Prisma.BundleGetPayload<{ include: typeof bundleInclude }>;

export const getBundles = unstable_cache(
  async () => db.bundle.findMany({ where: { status: 'ACTIVE' }, include: bundleInclude, orderBy: { sort: 'asc' } }),
  ['bundles'],
  CACHE,
);

export const getBundleBySlug = unstable_cache(
  async (slug: string) => db.bundle.findFirst({ where: { slug, status: 'ACTIVE' }, include: bundleInclude }),
  ['bundle-by-slug'],
  CACHE,
);

/** Price of a bundle using each item's cheapest active variant. */
export function bundlePricing(b: BundleWithRelations, includeOptional = false) {
  const lines = b.items.filter((i) => includeOptional || !i.optional);
  const subtotal = lines.reduce((s, i) => {
    const min = Math.min(...i.product.variants.map((v) => v.priceCents));
    return s + (Number.isFinite(min) ? min : 0) * i.qty;
  }, 0);
  const discount = Math.round((subtotal * b.discountPct) / 100);
  return { subtotal, discount, total: subtotal - discount, pieces: lines.reduce((s, i) => s + i.qty, 0) };
}

export const getHomeContent = unstable_cache(
  async () => {
    const now = new Date();
    const [banners, collections, announcement] = await Promise.all([
      db.banner.findMany({ where: { active: true }, orderBy: { sort: 'asc' } }),
      db.collection.findMany({
        where: { active: true },
        orderBy: { sort: 'asc' },
        include: { items: { orderBy: { sort: 'asc' }, include: { product: { include: productInclude } } } },
      }),
      db.announcement.findFirst({
        where: {
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { banners, collections, announcement };
  },
  ['home-content'],
  CACHE,
);
