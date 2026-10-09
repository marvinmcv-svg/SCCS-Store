import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '../product-form';
import { ImageManager } from '../image-manager';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage('manageCatalog');
  const t = await getTranslations('admin');
  const [product, categories] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { images: { orderBy: { sort: 'asc' } }, variants: { orderBy: [{ active: 'desc' }, { sizeSort: 'asc' }] } } }),
    db.category.findMany({ orderBy: { sort: 'asc' } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/products" className="t-caption mb-3 inline-block text-ink-2 hover:text-ink">
            ← {t('products.title')}
          </Link>
        }
        title={product.nameEs}
        actions={
          <Link href={`/p/${product.slug}`} target="_blank" className="pressable inline-flex h-10 items-center rounded-full px-4 text-[14px] font-medium ring-1 ring-inset ring-line-strong hover:ring-ink">
            {t('common.view')} ↗
          </Link>
        }
      />
      <div className="space-y-6">
        <ImageManager productId={product.id} initial={product.images.map((i) => ({ id: i.id, url: i.url }))} />
        <ProductForm
          categories={categories.map((c) => ({ id: c.id, name: c.nameEs }))}
          initial={{
            id: product.id,
            slug: product.slug,
            nameEs: product.nameEs,
            nameEn: product.nameEn,
            descEs: product.descEs,
            descEn: product.descEn,
            careEs: product.careEs,
            careEn: product.careEn,
            categoryId: product.categoryId,
            garmentType: (product.garmentType as never) ?? null,
            grades: product.grades as never,
            fit: product.fit,
            status: product.status,
            featured: product.featured,
            isNew: product.isNew,
            isUniform: product.isUniform,
            allowPreorder: product.allowPreorder,
            preorderDate: product.preorderDate ? product.preorderDate.toISOString().slice(0, 10) : null,
            tags: product.tags,
            variants: product.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, colorHex: v.colorHex, priceCents: v.priceCents, compareAtCents: v.compareAtCents, reorderPoint: v.reorderPoint, active: v.active, stock: v.stock })),
          }}
        />
      </div>
    </>
  );
}
