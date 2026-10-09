import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { upcomingSlots } from '@/lib/slots';
import { getCartView } from '@/lib/cart';
import { getCurrentUser } from '@/lib/session';
import { getSettings, pickupLocation } from '@/lib/settings';
import { enabledMethods } from '@/lib/payments';
import { formatSlot } from '@/lib/dates';
import { CheckoutForm } from './checkout-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [view, user, settings] = await Promise.all([getCartView(locale), getCurrentUser(), getSettings()]);
  if (!view.lines.length) redirect({ href: '/bag', locale });
  const slots = await upcomingSlots();
  return (
    <CheckoutForm
      view={view}
      user={user ? { name: user.name ?? '', email: user.email, phone: user.phone ?? '' } : null}
      slots={slots.map((s) => ({ id: s.id, label: formatSlot(s.startsAt, s.endsAt, locale), left: Math.max(0, s.capacity - s.booked) }))}
      methods={enabledMethods(settings.payments)}
      holdDays={settings.store.payAtSchoolHoldDays}
      location={pickupLocation(settings.store, locale)}
    />
  );
}
