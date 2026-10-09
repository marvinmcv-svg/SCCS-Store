import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { BagIcon } from '@/components/ui/icons';
import { ReorderButton } from '../../orders/[code]/reorder-button';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'profile' });
  return { title: t('orders'), robots: { index: false } };
}

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect({ href: '/login?callbackUrl=/profile/orders', locale });
  const t = await getTranslations();
  const orders = await db.order.findMany({ where: { userId: user!.id }, orderBy: { createdAt: 'desc' }, include: { items: true } });
  return (
    <div className="container-page pt-6 md:pt-12">
      <Link href="/profile" className="t-caption text-ink-2 hover:text-ink">
        ← {t('nav.profile')}
      </Link>
      <h1 className="t-h1 mt-3">{t('profile.orders')}</h1>
      {orders.length === 0 ? (
        <EmptyState icon={<BagIcon className="size-7" />} title={t('profile.noOrders')} description={t('profile.noOrdersBody')} action={<ButtonLink href="/shop">{t('bag.startShopping')}</ButtonLink>} />
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[4px] bg-bg-subtle p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/orders/${o.code}`} className="t-title underline-offset-4 hover:underline">
                    {o.code}
                  </Link>
                  <p className="t-caption text-ink-2">
                    {formatDate(o.createdAt, locale)} · <span className="tabular">{formatBs(o.totalCents)}</span> · {t('common.items', { count: o.items.reduce((s, i) => s + i.qty, 0) })}
                  </p>
                </div>
                <Badge tone={o.status === 'READY' ? 'success' : o.status === 'PICKED_UP' ? 'subtle' : ['CANCELLED', 'EXPIRED'].includes(o.status) ? 'red' : 'warning'}>{t(`order.status${o.status}`)}</Badge>
              </div>
              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
                {o.items.map((it) => (
                  <span key={it.id} className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-[3px] bg-bg">
                    {it.image && <Image src={it.image} alt={it.productName} fill sizes="64px" className="object-contain p-1" />}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <ButtonLink href={`/orders/${o.code}`} variant="secondary" size="sm" className="mt-6">
                  {t('order.track')}
                </ButtonLink>
                <ReorderButton code={o.code} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
