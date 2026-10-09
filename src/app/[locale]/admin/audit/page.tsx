import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { PageHeader, Table, Th, Td } from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filter-bar';

export const metadata: Metadata = { title: 'Auditoría' };
const PER = 50;

export default async function AuditPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { locale } = await params;
  await requireAdminPage('viewAudit');
  const t = await getTranslations('admin');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q } }, { entity: { contains: sp.q } }, { entityId: { contains: sp.q } }] } : {};
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, email: true } } } }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageHeader title={t('audit.title')} description={t('common.results', { count: total })} />
      <FilterBar searchPlaceholder={t('common.search')} />
      <Table>
        <thead>
          <tr>
            <Th>{t('audit.when')}</Th>
            <Th>{t('audit.actor')}</Th>
            <Th>{t('audit.action')}</Th>
            <Th>{t('audit.entity')}</Th>
            <Th>IP</Th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <Td className="t-caption whitespace-nowrap">{formatDateTime(l.createdAt, locale)}</Td>
              <Td>{l.actor?.name ?? l.actor?.email ?? t('audit.system')}</Td>
              <Td>
                <span className="font-mono text-[13px]">{l.action}</span>
                {l.meta && Object.keys(l.meta as object).length > 0 && <span className="t-caption block max-w-md truncate text-ink-2">{JSON.stringify(l.meta)}</span>}
              </Td>
              <Td className="t-caption">
                {l.entity}
                {l.entityId && <span className="block font-mono text-ink-3">{l.entityId.slice(0, 12)}</span>}
              </Td>
              <Td className="t-caption text-ink-2">{l.ip}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER))} label={t('common.page', { page, pages: Math.max(1, Math.ceil(total / PER)) })} />
    </>
  );
}
