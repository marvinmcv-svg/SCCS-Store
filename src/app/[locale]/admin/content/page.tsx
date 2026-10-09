import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { PageHeader } from '@/components/admin/ui';
import { BannerEditor, CollectionEditor, AnnouncementEditor, PromoEditor } from './content-editors';

export const metadata: Metadata = { title: 'Contenido' };

export default async function ContentPage() {
  await requireAdminPage('manageContent');
  const t = await getTranslations('admin');
  const [banners, collections, announcements, promos, products] = await Promise.all([
    db.banner.findMany({ orderBy: [{ placement: 'asc' }, { sort: 'asc' }] }),
    db.collection.findMany({ include: { items: { orderBy: { sort: 'asc' } } }, orderBy: { sort: 'asc' } }),
    db.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    db.promoCode.findMany({ orderBy: { createdAt: 'desc' } }),
    db.product.findMany({ where: { status: 'ACTIVE' }, orderBy: { sort: 'asc' }, select: { id: true, nameEs: true } }),
  ]);
  return (
    <>
      <PageHeader title={t('content.title')} />
      <div className="space-y-10">
        <section>
          <h2 className="t-title mb-4">{t('content.banners')}</h2>
          <div className="grid gap-6 xl:grid-cols-2">
            {banners.map((b) => (
              <BannerEditor key={b.id} banner={b} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="t-title mb-4">{t('content.collections')}</h2>
          {collections.map((c) => (
            <CollectionEditor key={c.id} collection={{ id: c.id, titleEs: c.titleEs, titleEn: c.titleEn, productIds: c.items.map((i) => i.productId) }} products={products.map((p) => ({ id: p.id, name: p.nameEs }))} />
          ))}
        </section>
        <section className="grid gap-6 xl:grid-cols-2">
          <div>
            <h2 className="t-title mb-4">{t('content.announcements')}</h2>
            <AnnouncementEditor announcement={announcements[0] ?? null} />
          </div>
          <div>
            <h2 className="t-title mb-4">{t('content.promos')}</h2>
            <PromoEditor promos={promos.map((p) => ({ id: p.id, code: p.code, pct: p.pct, amountCents: p.amountCents, maxUses: p.maxUses, uses: p.uses, active: p.active, expiresAt: p.expiresAt?.toISOString().slice(0, 10) ?? null }))} />
          </div>
        </section>
      </div>
    </>
  );
}
