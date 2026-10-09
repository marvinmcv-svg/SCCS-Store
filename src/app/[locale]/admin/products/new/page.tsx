import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '../product-form';

export default async function NewProduct() {
  await requireAdminPage('manageCatalog');
  const t = await getTranslations('admin');
  const categories = await db.category.findMany({ orderBy: { sort: 'asc' } });
  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/products" className="t-caption mb-3 inline-block text-ink-2 hover:text-ink">
            ← {t('products.title')}
          </Link>
        }
        title={t('products.new')}
      />
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.nameEs }))} />
    </>
  );
}
