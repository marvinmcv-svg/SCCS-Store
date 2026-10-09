import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatDate } from '@/lib/dates';
import { PageHeader, Table, Th, Td, StatusBadge } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/filter-bar';
import { InviteForm, UserRowActions } from './user-actions';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; role?: string }> }) {
  const { locale } = await params;
  const me = await requireAdminPage('manageUsers');
  const t = await getTranslations('admin');
  const sp = await searchParams;
  const users = await db.user.findMany({
    where: {
      ...(sp.role ? { role: sp.role as 'STAFF' } : {}),
      ...(sp.q ? { OR: [{ email: { contains: sp.q, mode: 'insensitive' } }, { name: { contains: sp.q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    include: { _count: { select: { orders: true, students: true } } },
  });
  return (
    <>
      <PageHeader title={t('users.title')} description={t('users.rolesHelp')} />
      <InviteForm />
      <div className="mt-8">
        <FilterBar searchPlaceholder={t('common.search')} filters={[{ name: 'role', label: t('users.role'), options: ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'].map((r) => ({ value: r, label: t(`roles.${r}` as 'roles.STAFF') })) }]} />
        <Table>
          <thead>
            <tr>
              <Th>{t('users.name')}</Th>
              <Th>{t('users.role')}</Th>
              <Th>{t('users.joined')}</Th>
              <Th>{t('orders.title')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.disabled ? 'opacity-50' : ''}>
                <Td>
                  <span className="block font-medium">{u.name ?? '—'}</span>
                  <span className="t-caption text-ink-2">{u.email}</span>
                </Td>
                <Td>
                  <StatusBadge tone={u.role === 'CUSTOMER' ? 'subtle' : 'accentSoft'}>{t(`roles.${u.role}`)}</StatusBadge>
                  {u.disabled && <StatusBadge tone="red">{t('users.disabled')}</StatusBadge>}
                </Td>
                <Td className="t-caption">{formatDate(u.createdAt, locale)}</Td>
                <Td className="tabular">{u._count.orders}</Td>
                <Td className="text-right">{u.id !== me.id && <UserRowActions id={u.id} role={u.role} disabled={u.disabled} />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
