'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from '@/components/ui/toaster';
import { toggleFavorite as toggleFavoriteAction } from '@/actions/favorites';
import { addToCart as addToCartAction } from '@/actions/cart';
import { haptic } from '@/lib/haptics';
import type { SavedSizes } from '@/lib/students';

export type StoreStudent = { id: string; name: string; grade: string; fit: string; sizes: SavedSizes };
export type StoreUser = { id: string; name: string | null; role: string } | null;

type Ctx = {
  user: StoreUser;
  students: StoreStudent[];
  count: number;
  setCount: (n: number) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string, name?: string) => Promise<void>;
  addToCart: (args: { variantId: string; qty?: number; studentId?: string | null; label?: string }) => Promise<boolean>;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
};

const StoreContext = React.createContext<Ctx | null>(null);

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function StoreProvider({
  children,
  user,
  students,
  initialCount,
  initialFavorites,
}: {
  children: React.ReactNode;
  user: StoreUser;
  students: StoreStudent[];
  initialCount: number;
  initialFavorites: string[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [count, setCount] = React.useState(initialCount);
  const [favorites, setFavorites] = React.useState(() => new Set(initialFavorites));
  const [bagOpen, setBagOpen] = React.useState(false);

  // Re-sync when fresh server data arrives (navigation / router.refresh),
  // adjusting state during render instead of in an effect.
  const favKey = initialFavorites.join(',');
  const [synced, setSynced] = React.useState({ count: initialCount, favKey });
  if (synced.count !== initialCount || synced.favKey !== favKey) {
    setSynced({ count: initialCount, favKey });
    setCount(initialCount);
    setFavorites(new Set(initialFavorites));
  }

  const openBag = React.useCallback(() => {
    if (window.matchMedia('(min-width: 768px)').matches) setBagOpen(true);
    else router.push('/bag');
  }, [router]);

  const toggleFavorite = React.useCallback(
    async (productId: string) => {
      const was = favorites.has(productId);
      haptic();
      // Optimistic flip; revert on failure.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (was) next.delete(productId);
        else next.add(productId);
        return next;
      });
      const res = await toggleFavoriteAction(productId);
      if (!res.ok) {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (was) next.add(productId);
          else next.delete(productId);
          return next;
        });
        toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
        return;
      }
      if (res.data.favorited) toast(t('product.favorited'), { action: { label: t('nav.favorites'), onClick: () => router.push('/favorites') } });
    },
    [favorites, t, router],
  );

  const addToCart = React.useCallback<Ctx['addToCart']>(
    async ({ variantId, qty = 1, studentId, label }) => {
      setCount((c) => c + qty); // optimistic badge
      const res = await addToCartAction({ variantId, qty, studentId });
      if (!res.ok) {
        setCount((c) => c - qty);
        haptic('error');
        toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
        return false;
      }
      setCount(res.data.count);
      haptic('success');
      toast(label ?? t('product.added'), { action: { label: t('product.viewBag'), onClick: openBag } });
      router.refresh();
      return true;
    },
    [t, openBag, router],
  );

  const value = React.useMemo<Ctx>(
    () => ({
      user,
      students,
      count,
      setCount,
      isFavorite: (id) => favorites.has(id),
      toggleFavorite,
      addToCart,
      bagOpen,
      setBagOpen: (o) => (o ? openBag() : setBagOpen(false)),
    }),
    [user, students, count, favorites, toggleFavorite, addToCart, bagOpen, openBag],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
