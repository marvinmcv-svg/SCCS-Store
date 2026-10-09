import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { Prisma } from '@prisma/client';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { formatBs } from '@/lib/money';
import { PageHeader, Table, Th, Td, StatusBadge, Empty } from '@/components/admin/ui';
import { FilterBar } from '@/components/admin/filter-bar';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Productos' };

export default async function AdminProducts({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  await requireAdminPage('manageCatalog');
  const sp = await searchParams;
  const t = await getTranslations('admin');
  const where: Prisma.ProductWhereInput = {
    ...(sp.status ? { status: sp.status as 'ACTIVE' } : { status: { not: 'ARCHIVED' } }),
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(sp.q ? { OR: [{ nameEs: { contains: sp.q, mode: 'insensitive' } }, { nameEn: { contains: sp.q, mode: 'insensitive' } }, { variants: { some: { sku: { contains: sp.q, mode: 'insensitive' } } } }] } : {}),
  };
  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }], include: { images: { take: 1, orderBy: { sort: 'asc' } }, variants: { where: { active: true } }, category: true } }),
    db.category.findMany({ orderBy: { sort: 'asc' } }),
  ]);
  return (
    <>
      <PageHeader title={t('products.title')} description={t('common.results', { count: products.length })} actions={<ButtonLink href="/admin/products/new">+ {t('products.new')}</ButtonLink>} />
      <FilterBar
        searchPlaceholder={t('common.search')}
        filters={[
          { name: 'status', label: t('products.status'), options: ['DRAFT', 'ACTIVE', 'ARCHIVED'].map((s) => ({ value: s, label: t(`products.status${s}` as 'products.statusDRAFT') })) },
          { name: 'category', label: t('products.category'), options: categories.map((c) => ({ value: c.id, label: locale === 'en' ? c.nameEn : c.nameEs })) },
        ]}
      />
      {products.length === 0 ? (
        <Empty title={t('common.none')} body={t('common.noneBody')} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('products.name')}</Th>
              <Th>{t('products.category')}</Th>
              <Th>{t('products.variants')}</Th>
              <Th>{t('products.stock')}</Th>
              <Th>{t('products.price')}</Th>
              <Th>{t('products.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              const low = p.variants.filter((v) => v.stock <= v.reorderPoint).length;
              const prices = p.variants.map((v) => v.priceCents);
              return (
                <tr key={p.id} className="hover:bg-bg-subtle">
                  <Td>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-[6px] bg-bg-subtle">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                      <span className="font-medium underline-offset-4 hover:underline">{locale === 'en' ? p.nameEn : p.nameEs}</span>
                    </Link>
                  </Td>
                  <Td className="t-caption">{locale === 'en' ? p.category.nameEn : p.category.nameEs}</Td>
                  <Td className="t-caption">{t('products.variantsCount', { count: p.variants.length })}</Td>
                  <Td>
                    <span className="tabular">{stock}</span> {low > 0 && <StatusBadge tone="red">{low} {t('inventory.low').toLowerCase()}</StatusBadge>}
                  </Td>
                  <Td className="tabular">{prices.length ? formatBs(Math.min(...prices)) : '—'}</Td>
                  <Td>
                    <StatusBadge tone={p.status === 'ACTIVE' ? 'success' : p.status === 'DRAFT' ? 'warning' : 'subtle'}>{t(`products.status${p.status}` as 'products.statusDRAFT')}</StatusBadge>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
