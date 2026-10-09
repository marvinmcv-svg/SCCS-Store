'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { BagIcon, HeartIcon, ShopIcon, UserIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useStore } from './store-provider';

const NAV = [
  { href: '/shop', key: 'all' },
  { href: '/shop/uniforms', key: 'uniforms' },
  { href: '/shop/pe', key: 'pe' },
  { href: '/shop/bags', key: 'bags' },
  { href: '/shop/accessories', key: 'accessories' },
  { href: '/shop/souvenirs', key: 'souvenirs' },
] as const;

/**
 * Desktop: slim top nav with destinations, search, favorites, profile, bag.
 * Mobile: logo + search only (navigation lives in the bottom tab bar).
 * Hides on scroll down, returns on scroll up.
 */
export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { count, setBagOpen } = useStore();
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      setHidden(y > 120 && y > last);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const icon = 'pressable grid size-11 place-items-center rounded-full hover:bg-bg-subtle';

  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-nav)] transition-[transform,background-color,box-shadow] duration-300 ease-[var(--ease-out)]',
        scrolled ? 'bg-bg/85 shadow-[0_1px_0_var(--line)] backdrop-blur-xl' : 'bg-bg',
        hidden && '-translate-y-full',
      )}
    >
      <div className="container-page flex h-14 items-center gap-6 md:h-16">
        <Logo />
        <nav aria-label={t('nav.main')} className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === '/shop' ? pathname === '/shop' : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cn(
                      'pressable rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-bg-subtle',
                      active ? 'text-ink' : 'text-ink-2',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {n.key === 'all' ? t('nav.shop') : t(`categories.${n.key}`)}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/bundles"
                className={cn(
                  'pressable rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-bg-subtle',
                  pathname.startsWith('/bundles') ? 'text-ink' : 'text-ink-2',
                )}
              >
                {t('nav.bundles')}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="ml-auto flex items-center md:ml-0">
          <Link href="/search" className={icon} aria-label={t('nav.search')}>
            <ShopIcon className="size-[22px]" />
          </Link>
          <Link href="/favorites" className={cn(icon, 'hidden md:grid')} aria-label={t('nav.favorites')}>
            <HeartIcon className="size-[22px]" />
          </Link>
          <Link href="/profile" className={cn(icon, 'hidden md:grid')} aria-label={t('nav.profile')}>
            <UserIcon className="size-[22px]" />
          </Link>
          <button
            type="button"
            onClick={() => setBagOpen(true)}
            className={cn(icon, 'relative hidden md:grid')}
            aria-label={t('nav.openBag', { count })}
          >
            <BagIcon className="size-[22px]" />
            {count > 0 && (
              <span className="tabular absolute top-1.5 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
