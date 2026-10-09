import type { ProductFilters } from '@/lib/catalog';

export type ShopSearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(',') : (v ?? ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function parseShopParams(sp: ShopSearchParams, category?: string): ProductFilters & { page: number; garments: string[]; studentId?: string } {
  const sort = typeof sp.sort === 'string' && ['featured', 'new', 'price-asc', 'price-desc'].includes(sp.sort) ? (sp.sort as ProductFilters['sort']) : 'featured';
  const max = Number(sp.max);
  return {
    category,
    grades: list(sp.grade),
    fit: list(sp.fit),
    sizes: list(sp.size),
    inStock: sp.stock === '1',
    maxPrice: Number.isFinite(max) && max > 0 ? max * 100 : undefined,
    sort,
    q: typeof sp.q === 'string' ? sp.q.slice(0, 80) : undefined,
    page: Math.max(1, Math.min(50, Number(sp.page) || 1)),
    garments: list(sp.garment),
    studentId: typeof sp.student === 'string' ? sp.student : undefined,
  };
}
