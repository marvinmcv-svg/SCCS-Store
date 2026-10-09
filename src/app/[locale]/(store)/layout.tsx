import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { getCartCount, favoriteOwnerKey } from '@/lib/cart';
import { getHomeContent } from '@/lib/catalog';
import { parseSizes } from '@/lib/students';
import { loc } from '@/lib/utils';
import { StoreProvider } from '@/components/store/store-provider';
import { SiteHeader } from '@/components/store/site-header';
import { SiteFooter } from '@/components/store/site-footer';
import { TabBar } from '@/components/store/tab-bar';
import { AnnouncementBar } from '@/components/store/announcement-bar';
import { BagDrawer } from '@/components/store/bag-drawer';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [locale, t, user, count, ownerKey, content] = await Promise.all([
    getLocale(),
    getTranslations('common'),
    getCurrentUser(),
    getCartCount(),
    favoriteOwnerKey(),
    getHomeContent(),
  ]);
  const [students, favorites] = await Promise.all([
    user ? db.student.findMany({ where: { parentId: user.id }, orderBy: { createdAt: 'asc' } }) : Promise.resolve([]),
    ownerKey ? db.favorite.findMany({ where: { ownerKey }, select: { productId: true } }) : Promise.resolve([]),
  ]);
  const a = content.announcement;

  return (
    <StoreProvider
      user={user ? { id: user.id, name: user.name, role: user.role } : null}
      students={students.map((s) => ({ id: s.id, name: s.name, grade: s.grade, fit: s.fit, sizes: parseSizes(s.sizes) }))}
      initialCount={count}
      initialFavorites={favorites.map((f) => f.productId)}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-bg">
        {t('skipToContent')}
      </a>
      {a && <AnnouncementBar text={loc(a, 'text', locale)} href={a.href} />}
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
      <TabBar />
      <BagDrawer />
    </StoreProvider>
  );
}
