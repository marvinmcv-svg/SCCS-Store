import * as React from 'react';
import { ViewTransition } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { SwatchDots } from '@/components/ui/swatch';
import { cn } from '@/lib/utils';

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  priceCents: number;
  compareAtCents?: number | null;
  fromPrice?: boolean;
  images: { url: string; blur?: string | null; alt?: string | null }[];
  colors?: string[];
  badge?: { label: string; tone: BadgeTone } | null;
};

/**
 * On-style product card: big image on the neutral backdrop, no borders,
 * second image on hover (desktop), quiet text block. The image morphs into
 * the PDP gallery via a shared <ViewTransition> name.
 */
export function ProductCard({
  product,
  action,
  priority,
  sizes = '(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 48vw',
  fromLabel,
  className,
  morph = true,
}: {
  product: ProductCardData;
  action?: React.ReactNode;
  priority?: boolean;
  sizes?: string;
  fromLabel?: string;
  className?: string;
  /** Shared-element name must be unique on a page; disable for repeats. */
  morph?: boolean;
}) {
  const [first, second] = product.images;
  return (
    <article className={cn('group/card relative', className)}>
      <Link href={`/p/${product.slug}`} className="pressable block outline-none" prefetch>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-bg-subtle">
          <MaybeTransition name={morph ? `product-${product.slug}` : undefined}>
            <div className="absolute inset-0">
              {first ? (
                <Image
                  src={first.url}
                  alt={first.alt || product.name}
                  fill
                  sizes={sizes}
                  priority={priority}
                  placeholder={first.blur ? 'blur' : 'empty'}
                  blurDataURL={first.blur ?? undefined}
                  className={cn(
                    'object-contain p-[6%] transition-opacity duration-300 ease-[var(--ease-out)]',
                    second && 'md:group-hover/card:opacity-0',
                  )}
                />
              ) : (
                <div className="grid h-full place-items-center t-label text-ink-3">SCCS</div>
              )}
            </div>
          </MaybeTransition>
          {second && (
            <Image
              src={second.url}
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              className="hidden object-cover opacity-0 transition-opacity duration-300 ease-[var(--ease-out)] md:block md:group-hover/card:opacity-100"
            />
          )}
          {product.badge && (
            <Badge tone={product.badge.tone} className="absolute top-2 left-2">
              {product.badge.label}
            </Badge>
          )}
        </div>
        <div className="px-0.5 pt-3">
          <h3 className="t-body line-clamp-2 font-medium">{product.name}</h3>
          {product.subtitle && <p className="t-caption mt-0.5 text-ink-2">{product.subtitle}</p>}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <Price
              cents={product.priceCents}
              compareAt={product.compareAtCents}
              from={product.fromPrice}
              fromLabel={fromLabel}
              className="t-body"
            />
            {product.colors && product.colors.length > 1 && <SwatchDots colors={product.colors} />}
          </div>
        </div>
      </Link>
      {action && <div className="absolute top-1 right-1">{action}</div>}
    </article>
  );
}

function MaybeTransition({ name, children }: { name?: string; children: React.ReactNode }) {
  if (!name) return <>{children}</>;
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
