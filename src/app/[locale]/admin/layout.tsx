import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { can } from '@/lib/session';
import { AdminShell, type NavItem } from '@/components/admin/admin-shell';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin SCCS Store' }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const user = await requireAdminPage();
  const [toVerify, ready, exchanges] = await Promise.all([
    db.order.count({ where: { paymentStatus: 'SUBMITTED', status: { notIn: ['CANCELLED', 'EXPIRED'] } } }),
    db.order.count({ where: { status: 'READY' } }),
    db.exchangeRequest.count({ where: { status: 'REQUESTED' } }),
  ]);
  const all: (NavItem & { show: boolean })[] = [
    { href: '/admin', key: 'dashboard', icon: '', show: true },
    { href: '/admin/orders', key: 'orders', icon: '', badge: toVerify, show: can.manageOrders(user) },
    { href: '/admin/pickup', key: 'pickup', icon: '', badge: ready, show: can.managePickups(user) },
    { href: '/admin/products', key: 'products', icon: '', show: can.manageCatalog(user) },
    { href: '/admin/bundles', key: 'bundles', icon: '', show: can.manageCatalog(user) },
    { href: '/admin/inventory', key: 'inventory', icon: '', show: can.manageInventory(user) },
    { href: '/admin/slots', key: 'slots', icon: '', show: can.managePickups(user) },
    { href: '/admin/exchanges', key: 'exchanges', icon: '', badge: exchanges, show: can.manageOrders(user) },
    { href: '/admin/content', key: 'content', icon: '', show: can.manageContent(user) },
    { href: '/admin/reports', key: 'reports', icon: '', show: can.viewReports(user) },
    { href: '/admin/users', key: 'users', icon: '', show: can.manageUsers(user) },
    { href: '/admin/settings', key: 'settings', icon: '', show: can.manageSettings(user) },
    { href: '/admin/audit', key: 'audit', icon: '', show: can.viewAudit(user) },
  ];
  return (
    <AdminShell items={all.filter((i) => i.show).map(({ show: _show, ...i }) => i)} user={{ name: user.name ?? user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}
