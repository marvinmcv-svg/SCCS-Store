import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { PageHeader, StatusBadge } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Kits' };

export default async function AdminBundles() {
  await requireAdminPage('manageCatalog');
  const t = await getTranslations('admin');
  const bundles = await db.bundle.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { items: true } } } });
  return (
    <>
      <PageHeader title={t('bundles.title')} actions={<ButtonLink href="/admin/bundles/new">+ {t('bundles.new')}</ButtonLink>} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bundles.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bundles/${b.id}`} className="pressable block rounded-[14px] bg-bg-subtle p-3">
              <span className="relative block aspect-[4/5] overflow-hidden rounded-[8px] bg-bg">{b.image && <Image src={b.image} alt="" fill sizes="25vw" className="object-cover" />}</span>
              <span className="mt-3 flex items-center justify-between gap-2 px-1">
                <span className="t-body font-medium">{b.nameEs}</span>
                <StatusBadge tone={b.status === 'ACTIVE' ? 'success' : 'warning'}>{b.discountPct}%</StatusBadge>
              </span>
              <span className="t-caption block px-1 text-ink-2">{t('bundles.items')}: {b._count.items}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
