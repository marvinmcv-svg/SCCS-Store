'use client';

import { useTranslations } from 'next-intl';
import { HeartIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useStore } from './store-provider';

export function FavoriteButton({ productId, className, size = 'sm' }: { productId: string; className?: string; size?: 'sm' | 'md' }) {
  const t = useTranslations('product');
  const { isFavorite, toggleFavorite } = useStore();
  const active = isFavorite(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? t('unfavorite') : t('favorite')}
      onClick={(e) => {
        e.preventDefault();
        void toggleFavorite(productId);
      }}
      className={cn(
        'pressable grid place-items-center rounded-full',
        size === 'sm' ? 'size-11' : 'size-12 bg-bg-subtle hover:bg-bg-muted',
        className,
      )}
    >
      <HeartIcon
        filled={active}
        className={cn('size-[22px] transition-transform duration-200', active ? 'scale-110 text-red' : 'text-ink')}
      />
    </button>
  );
}
