import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { studentChecklists } from '@/lib/checklist';
import { formatBs } from '@/lib/money';
import { formatDate } from '@/lib/dates';
import { gradeLabel } from '@/config/catalog';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher, ThemeSwitcher } from '@/components/store/locale-theme';
import { CrestMark } from '@/components/ui/icons';
import { PreferencesForm } from './preferences-form';
import { SignOutButton } from './sign-out-button';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'profile' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, user] = await Promise.all([getTranslations(), getCurrentUser()]);

  if (!user) {
    return (
      <div className="container-page flex flex-col items-start py-10 md:items-center md:py-24 md:text-center">
        <CrestMark className="h-14 text-accent" />
        <h1 className="t-h1 mt-6">{t('profile.signInTitle')}</h1>
        <p className="t-body mt-3 max-w-md text-[17px] text-ink-2">{t('profile.signInBody')}</p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <ButtonLink href="/login?callbackUrl=/profile" size="lg" block>
            {t('auth.signIn')}
          </ButtonLink>
          <ButtonLink href="/register?callbackUrl=/profile" variant="secondary" size="lg" block>
            {t('auth.signUp')}
          </ButtonLink>
          <ButtonLink href="/orders/lookup" variant="ghost" size="lg" block>
            {t('profile.trackOrder')}
          </ButtonLink>
        </div>
        <div className="mt-12 flex flex-col items-start gap-3 md:items-center">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
    );
  }

  const [checklists, orders] = await Promise.all([
    studentChecklists(user.id, locale),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 3, include: { items: { take: 3 } } }),
  ]);

  return (
    <div className="container-page pt-6 md:pt-12">
      <p className="t-label text-ink-2">{user.email}</p>
      <h1 className="t-h1 mt-2">{t('profile.hello', { name: (user.name ?? '').split(' ')[0] || '👋' })}</h1>
      {user.role !== 'CUSTOMER' && (
        <ButtonLink href="/admin" variant="secondary" size="sm" className="mt-4">
          {t('profile.adminPortal')} →
        </ButtonLink>
      )}

      <section className="mt-10" aria-labelledby="students">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="students" className="t-h2">
            {t('profile.students')}
          </h2>
          <Link href="/profile/students" className="t-body font-medium underline underline-offset-[6px]">
            {t('common.edit')}
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {checklists.map((c) => (
            <Link key={c.studentId} href="/profile/students" className="pressable flex items-center justify-between gap-4 rounded-[4px] bg-bg-subtle p-5">
              <div>
                <p className="t-title">{c.name}</p>
                <p className="t-caption text-ink-2">{gradeLabel(c.grade, locale)}</p>
              </div>
              <Badge tone={c.missing ? 'warning' : 'success'}>{c.missing ? `${c.missing} ${t('profile.missing').toLowerCase()}` : t('profile.owned')}</Badge>
            </Link>
          ))}
          <Link href="/profile/students?new=1" className="pressable grid min-h-20 place-items-center rounded-[4px] border border-dashed border-line-strong p-5 t-body font-medium text-ink-2 hover:border-ink hover:text-ink">
            + {t('profile.addStudent')}
          </Link>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="orders">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="orders" className="t-h2">
            {t('profile.orders')}
          </h2>
          {orders.length > 0 && (
            <Link href="/profile/orders" className="t-body font-medium underline underline-offset-[6px]">
              {t('common.seeAll')}
            </Link>
          )}
        </div>
        {orders.length === 0 ? (
          <p className="t-body text-ink-2">{t('profile.noOrdersBody')}</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.code}`} className="pressable flex items-center gap-4 py-4">
                  <span className="flex -space-x-3">
                    {o.items.map((it) => (
                      <span key={it.id} className="relative size-12 overflow-hidden rounded-full bg-bg-subtle ring-2 ring-bg">
                        {it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-contain p-1" />}
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-body block font-medium">{o.code}</span>
                    <span className="t-caption block text-ink-2">
                      {formatDate(o.createdAt, locale)} · <span className="tabular">{formatBs(o.totalCents)}</span>
                    </span>
                  </span>
                  <Badge tone={o.status === 'READY' ? 'success' : o.status === 'PICKED_UP' ? 'subtle' : ['CANCELLED', 'EXPIRED'].includes(o.status) ? 'red' : 'warning'}>{t(`order.status${o.status}`)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="settings">
        <h2 id="settings" className="t-h2 mb-6">
          {t('profile.settings')}
        </h2>
        <div className="grid gap-10 md:grid-cols-2">
          <PreferencesForm
            initial={{ name: user.name ?? '', phone: user.phone ?? '', locale: user.locale as 'es' | 'en', notifyEmail: user.notifyEmail, notifyWhatsapp: user.notifyWhatsapp }}
          />
          <div className="space-y-6">
            <div>
              <p className="t-label mb-3 text-ink-2">{t('common.language')}</p>
              <LocaleSwitcher />
            </div>
            <div>
              <p className="t-label mb-3 text-ink-2">{t('common.theme')}</p>
              <ThemeSwitcher />
            </div>
            <p className="t-caption text-ink-2">{t('profile.privacyNote')}</p>
            <SignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}
