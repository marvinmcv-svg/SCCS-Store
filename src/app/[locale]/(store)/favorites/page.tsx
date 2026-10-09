import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { favoriteOwnerKey, findCart } from '@/lib/cart';
import { getActiveProducts, toCard } from '@/lib/catalog';
import { availability } from '@/lib/stock';
import { cardLabels } from '@/lib/card-labels';
import { loc } from '@/lib/utils';
import { ProductCard } from '@/components/store/product-card';
import { FavoriteButton } from '@/components/store/favorite-button';
import { QuickAdd } from '@/components/store/quick-add';
import { EmptyState } from '@/components/ui/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { HeartIcon } from '@/components/ui/icons';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'favorites' });
  return { title: t('title'), robots: { index: false } };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, ownerKey, labels, products, cart] = await Promise.all([getTranslations(), favoriteOwnerKey(), cardLabels(), getActiveProducts(), findCart()]);
  const favs = ownerKey ? await db.favorite.findMany({ where: { ownerKey }, orderBy: { createdAt: 'desc' } }) : [];
  const list = favs.map((f) => products.find((p) => p.id === f.productId)).filter((p): p is NonNullable<typeof p> => !!p);
  const avail = await availability(
    list.flatMap((p) => p.variants.map((v) => v.id)),
    cart?.id,
  );

  return (
    <div className="container-page pt-6 md:pt-12">
      <h1 className="t-h1">{t('favorites.title')}</h1>
      {list.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="size-7" />}
          title={t('favorites.empty')}
          description={t('favorites.emptyBody')}
          action={<ButtonLink href="/shop">{t('bag.startShopping')}</ButtonLink>}
        />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-2 gap-y-10 md:grid-cols-3 md:gap-x-4 xl:grid-cols-4">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col gap-3">
              <ProductCard product={toCard(p, locale, labels)} fromLabel={t('common.from')} action={<FavoriteButton productId={p.id} />} />
              <QuickAdd
                productId={p.id}
                name={loc(p, 'name', locale)}
                allowPreorder={p.allowPreorder}
                variants={p.variants.map((v) => ({ id: v.id, size: v.size, available: avail[v.id] ?? 0 }))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
