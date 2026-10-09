import { getTranslations } from 'next-intl/server';
import { Carousel } from '@/components/ui/carousel';
import { ProductCard, type ProductCardData } from './product-card';
import { FavoriteButton } from './favorite-button';
import { SectionHeader } from './section-header';

export async function ProductRail({
  title,
  products,
  href,
  eyebrow,
  priorityFirst,
  morphIds,
}: {
  title: string;
  products: ProductCardData[];
  href?: string;
  eyebrow?: string;
  priorityFirst?: boolean;
  /** Products allowed to carry the shared-element name (first appearance on the page). */
  morphIds?: Set<string>;
}) {
  if (!products.length) return null;
  const t = await getTranslations('common');
  return (
    <section className="py-8 md:py-12" aria-label={title}>
      <SectionHeader title={title} href={href} linkLabel={t('seeAll')} eyebrow={eyebrow} />
      <Carousel ariaLabel={title} prevLabel={t('prev')} nextLabel={t('next')}>
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            priority={priorityFirst && i < 2}
            fromLabel={t('from')}
            morph={morphIds ? morphIds.has(p.id) : true}
            action={<FavoriteButton productId={p.id} />}
          />
        ))}
      </Carousel>
    </section>
  );
}
