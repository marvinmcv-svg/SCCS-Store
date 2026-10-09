import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LookupForm } from './lookup-form';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'order' });
  return { title: t('lookupTitle'), robots: { index: false } };
}

export default async function LookupPage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return (
    <div className="container-page flex justify-center py-10 md:py-20">
      <LookupForm />
    </div>
  );
}
