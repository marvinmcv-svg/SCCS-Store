'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { SideDrawer } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { CrestMark } from '@/components/ui/icons';
import { LocaleSwitcher, ThemeSwitcher } from '@/components/store/locale-theme';

export type NavItem = { href: string; key: string; icon: string; badge?: number };

const ICONS: Record<string, string> = {
  dashboard: 'M4 13h7V4H4zm9 7h7v-9h-7zM4 20h7v-5H4zm9-11h7V4h-7z',
  orders: 'M6 3h12l1 18H5zM9 7h6M9 11h6M9 15h4',
  pickup: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 3h2m2 0h2m-6 3h6m-3-6v3',
  products: 'M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16zM12 12l8.5-4M12 12v8.5M12 12 3.5 8',
  bundles: 'M4 7h16v13H4zM9 7V4h6v3M4 12h16',
  inventory: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  slots: 'M4 6h16v14H4zM4 10h16M8 3v4m8-4v4',
  content: 'M4 5h16v14H4zm0 10 5-5 4 4 3-3 4 4',
  exchanges: 'M4 8h13l-3-3M20 16H7l3 3',
  reports: 'M4 20h16M7 16V10m5 6V6m5 10v-4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9c.6-3.5 3.4-5.5 7-5.5s6.4 2 7 5.5M17 7a3 3 0 0 1 0 6m2 7c-.3-2-1.3-3.4-3-4.2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3a8 8 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a8 8 0 0 0-3-1.7L14 2h-4l-.5 2.7a8 8 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A8 8 0 0 0 4 12c0 .6 0 1.2.2 1.7l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 3 1.7L10 22h4l.5-2.7a8 8 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z',
  audit: 'M9 4h6l1 3H8zM6 7h12v13H6zm3 5h6m-6 4h4',
};

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const active = i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn('pressable flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors', active ? 'bg-ink text-bg' : 'text-ink-2 hover:bg-bg-subtle hover:text-ink')}
            >
              <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={ICONS[i.key]} />
              </svg>
              <span className="flex-1">{t(i.key)}</span>
              {!!i.badge && <span className={cn('tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold', active ? 'bg-bg text-ink' : 'bg-accent text-accent-ink')}>{i.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminShell({ items, user, children }: { items: NavItem[]; user: { name: string; role: string }; children: React.ReactNode }) {
  const t = useTranslations('admin');
  const [open, setOpen] = React.useState(false);
  const footer = (
    <div className="space-y-3 border-t border-line pt-4">
      <div>
        <p className="t-body font-medium">{user.name}</p>
        <p className="t-label text-ink-2">{t(`roles.${user.role}` as 'roles.STAFF')}</p>
      </div>
      <LocaleSwitcher />
      <ThemeSwitcher />
      <Link href="/" className="t-caption block text-ink-2 underline underline-offset-4 hover:text-ink">
        {t('store')} ↗
      </Link>
    </div>
  );
  return (
    <div className="min-h-[100svh] bg-bg md:grid md:grid-cols-[248px_1fr] print:block">
      <aside className="sticky top-0 hidden h-[100svh] print:!hidden flex-col gap-6 overflow-y-auto border-r border-line px-4 py-5 md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2">
          <CrestMark className="h-8 text-accent" />
          <span className="leading-none">
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">SCCS Store</span>
            <span className="t-label text-[9.5px] text-ink-2">{t('title')}</span>
          </span>
        </Link>
        <nav aria-label={t('title')} className="flex-1">
          <NavList items={items} />
        </nav>
        {footer}
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[var(--z-nav)] flex h-14 print:hidden items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur-xl md:hidden">
          <Link href="/admin" className="flex items-center gap-2">
            <CrestMark className="h-7 text-accent" />
            <span className="text-[15px] font-semibold">{t('title')}</span>
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="pressable grid size-11 place-items-center rounded-full hover:bg-bg-subtle" aria-label={t('menu')}>
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </header>
        <main id="main" className="px-4 py-6 md:px-10 md:py-10">
          {children}
        </main>
      </div>
      <SideDrawer open={open} onOpenChange={setOpen} title={t('title')} footer={footer}>
        <NavList items={items} onNavigate={() => setOpen(false)} />
      </SideDrawer>
    </div>
  );
}
