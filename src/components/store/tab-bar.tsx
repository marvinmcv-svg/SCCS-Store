'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { BagIcon, HeartIcon, HomeIcon, ShopIcon, UserIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useStore } from './store-provider';

const TABS = [
  { href: '/', key: 'home', Icon: HomeIcon, match: (p: string) => p === '/' },
  { href: '/shop', key: 'shop', Icon: ShopIcon, match: (p: string) => /^\/(shop|p\/|bundles|search)/.test(p) },
  { href: '/favorites', key: 'favorites', Icon: HeartIcon, match: (p: string) => p.startsWith('/favorites') },
  { href: '/bag', key: 'bag', Icon: BagIcon, match: (p: string) => p.startsWith('/bag') },
  { href: '/profile', key: 'profile', Icon: UserIcon, match: (p: string) => /^\/(profile|login|register|orders)/.test(p) },
] as const;

/** Mobile bottom tab bar: icon + label, active = filled icon. */
export function TabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { count } = useStore();
  if (pathname.startsWith('/checkout')) return null;

  return (
    <nav
      aria-label={t('tabs')}
      className="safe-bottom fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-line bg-bg/90 backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-[var(--tabbar-h)] grid-cols-5">
        {TABS.map(({ href, key, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'pressable relative flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.01em]',
                  active ? 'text-ink' : 'text-ink-2',
                )}
              >
                <span className="relative">
                  <Icon filled={active} className="size-6" />
                  {key === 'bag' && count > 0 && (
                    <span className="tabular absolute -top-1.5 -right-2.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
                      {count}
                    </span>
                  )}
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
