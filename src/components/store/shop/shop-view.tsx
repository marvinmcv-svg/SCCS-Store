import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { getCategories, listProducts, toCard } from '@/lib/catalog';
import { cardLabels } from '@/lib/card-labels';
import { parseShopParams, type ShopSearchParams } from '@/lib/shop-params';
import { ProductCard } from '@/components/store/product-card';
import { FavoriteButton } from '@/components/store/favorite-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { ShopIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { ShopToolbar } from './shop-toolbar';

const PAGE = 24;

export async function ShopView({ locale, sp, category }: { locale: string; sp: ShopSearchParams; category?: string }) {
  const t = await getTranslations();
  const f = parseShopParams(sp, category);
  const [all, categories, labels] = await Promise.all([listProducts(f), getCategories(), cardLabels()]);
  const filtered = f.garments.length ? all.filter((p) => p.garmentType && f.garments.includes(p.garmentType)) : all;
  const shown = filtered.slice(0, f.page * PAGE);
  const cat = categories.find((c) => c.slug === category);
  const title = cat ? (locale === 'en' ? cat.nameEn : cat.nameEs) : t('shop.title');
  const keep = Object.fromEntries(Object.entries(sp).filter(([k, v]) => typeof v === 'string' && k !== 'page')) as Record<string, string>;

  return (
    <>
      <div className="container-page pt-6 pb-4 md:pt-12">
        <h1 className="t-h1">{title}</h1>
        <nav aria-label={t('shop.category')} className="no-scrollbar -mx-[var(--gutter)] mt-5 flex gap-2 overflow-x-auto px-[var(--gutter)]">
          <Link
            href={{ pathname: '/shop', query: keep }}
            className={cn('pressable inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset', !category ? 'bg-ink text-bg ring-ink' : 'ring-line-strong hover:ring-ink')}
            aria-current={!category ? 'page' : undefined}
          >
            {t('shop.all')}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={{ pathname: `/shop/${c.slug}`, query: keep }}
              className={cn(
                'pressable inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset',
                category === c.slug ? 'bg-ink text-bg ring-ink' : 'ring-line-strong hover:ring-ink',
              )}
              aria-current={category === c.slug ? 'page' : undefined}
            >
              {locale === 'en' ? c.nameEn : c.nameEs}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense>
        <ShopToolbar total={filtered.length} category={category} />
      </Suspense>
      <div className="container-page pt-6">
        {shown.length === 0 ? (
          <EmptyState
            icon={<ShopIcon className="size-7" />}
            title={t('shop.noResults')}
            description={t('shop.noResultsBody')}
            action={
              <ButtonLink href={category ? `/shop/${category}` : '/shop'} variant="secondary">
                {t('shop.clearAll')}
              </ButtonLink>
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 md:gap-x-4 md:gap-y-12 xl:grid-cols-4">
              {shown.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={toCard(p, locale, labels)} priority={i < 4} fromLabel={t('common.from')} action={<FavoriteButton productId={p.id} />} />
                </li>
              ))}
            </ul>
            {filtered.length > shown.length && (
              <div className="mt-12 flex justify-center">
                <ButtonLink href={{ pathname: category ? `/shop/${category}` : '/shop', query: { ...keep, page: String(f.page + 1) } }} variant="secondary" size="lg" scroll={false}>
                  {t('shop.loadMore')}
                </ButtonLink>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
