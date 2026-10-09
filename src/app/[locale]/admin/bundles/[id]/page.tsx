import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { PageHeader } from '@/components/admin/ui';
import { BundleForm } from './bundle-form';

export default async function EditBundle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage('manageCatalog');
  const t = await getTranslations('admin');
  const [bundle, products] = await Promise.all([
    id === 'new' ? null : db.bundle.findUnique({ where: { id }, include: { items: { orderBy: { sort: 'asc' } } } }),
    db.product.findMany({ where: { status: { not: 'ARCHIVED' } }, orderBy: { sort: 'asc' }, select: { id: true, nameEs: true } }),
  ]);
  if (id !== 'new' && !bundle) notFound();
  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/bundles" className="t-caption mb-3 inline-block text-ink-2 hover:text-ink">
            ← {t('bundles.title')}
          </Link>
        }
        title={bundle?.nameEs ?? t('bundles.new')}
      />
      <BundleForm
        products={products.map((p) => ({ id: p.id, name: p.nameEs }))}
        image={bundle?.image ?? null}
        initial={
          bundle
            ? {
                id: bundle.id,
                slug: bundle.slug,
                nameEs: bundle.nameEs,
                nameEn: bundle.nameEn,
                descEs: bundle.descEs,
                descEn: bundle.descEn,
                grades: bundle.grades as never,
                fit: bundle.fit,
                discountPct: bundle.discountPct,
                status: bundle.status,
                items: bundle.items.map((i) => ({ productId: i.productId, qty: i.qty, optional: i.optional })),
              }
            : undefined
        }
      />
    </>
  );
}
