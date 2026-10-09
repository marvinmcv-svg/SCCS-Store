import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { DesignShowcase } from './showcase';
import { QrCode } from '@/components/ui/qr-code';

export const metadata: Metadata = { title: 'Design system', robots: { index: false, follow: false } };

/** Hidden route: every component and state in one place. */
export default async function DesignPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DesignShowcase qr={<QrCode value="SCCS-PICKUP-DEMO-7K2Q9" label="Pickup QR demo" className="max-w-[200px]" />} />;
}
