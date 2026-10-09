import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatDateTime } from '@/lib/dates';
import { PageHeader, Table, Th, Td, StatusBadge, Card } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/filter-bar';
import { AdjustButton, ImportCsv } from './inventory-actions';

export const metadata: Metadata = { title: 'Inventario' };

export default async function Inventory({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requireAdminPage('manageInventory');
  const sp = await searchParams;
  const t = await getTranslations('admin');
  const where: Prisma.VariantWhereInput = {
    active: true,
    product: { status: { not: 'ARCHIVED' } },
    ...(sp.q ? { OR: [{ sku: { contains: sp.q, mode: 'insensitive' } }, { product: { nameEs: { contains: sp.q, mode: 'insensitive' } } }] } : {}),
  };
  let variants = await db.variant.findMany({ where, include: { product: { select: { nameEs: true } } }, orderBy: [{ product: { sort: 'asc' } }, { sizeSort: 'asc' }] });
  if (sp.low === '1') variants = variants.filter((v) => v.stock <= v.reorderPoint);
  const movements = await db.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 25, include: { variant: { select: { sku: true } }, actor: { select: { name: true } } } });

  return (
    <>
      <PageHeader
        title={t('inventory.title')}
        description={t('common.results', { count: variants.length })}
        actions={
          <>
            <ImportCsv />
            {/* File download from a route handler, not a page. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/admin/export/inventory" download className="pressable inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset ring-line-strong hover:ring-ink">
              {t('common.export')}
            </a>
          </>
        }
      />
      <FilterBar searchPlaceholder={t('common.search')} filters={[{ name: 'low', label: t('inventory.lowOnly'), options: [{ value: '1', label: t('inventory.low') }] }]} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Table>
          <thead>
            <tr>
              <Th>{t('products.sku')}</Th>
              <Th>{t('products.name')}</Th>
              <Th>{t('products.size')}</Th>
              <Th className="text-right">{t('products.stock')}</Th>
              <Th className="text-right">{t('products.reorder')}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="hover:bg-bg-subtle">
                <Td className="font-mono text-[13px]">{v.sku}</Td>
                <Td>{v.product.nameEs}</Td>
                <Td>{v.size}</Td>
                <Td className="text-right">
                  <span className="tabular font-medium">{v.stock}</span> {v.stock <= v.reorderPoint && <StatusBadge tone="red">{t('inventory.low')}</StatusBadge>}
                </Td>
                <Td className="tabular text-right text-ink-2">{v.reorderPoint}</Td>
                <Td className="text-right">
                  <AdjustButton variantId={v.id} label={`${v.sku} · ${v.product.nameEs}`} stock={v.stock} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Card title={t('inventory.history')}>
          <ul className="space-y-3">
            {movements.map((m) => (
              <li key={m.id} className="t-caption">
                <span className="flex justify-between gap-2">
                  <span className="font-mono">{m.variant.sku}</span>
                  <span className={`tabular font-medium ${m.delta > 0 ? 'text-success' : 'text-red'}`}>
                    {m.delta > 0 ? '+' : ''}
                    {m.delta}
                  </span>
                </span>
                <span className="text-ink-2">
                  {t(`inventory.reason${m.reason}` as 'inventory.reasonSALE')} · {t('inventory.after')} {m.stockAfter}
                  {m.note && ` · ${m.note}`}
                </span>
                <span className="block text-ink-3">
                  {formatDateTime(m.createdAt, locale)}
                  {m.actor?.name && ` · ${m.actor.name}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
