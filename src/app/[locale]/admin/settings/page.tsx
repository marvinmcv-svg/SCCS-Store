import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { requireAdminPage } from '@/lib/admin';
import { getSettings } from '@/lib/settings';
import { PageHeader, Card, StatusBadge } from '@/components/admin/ui';
import { PaymentSettingsForm, StoreSettingsForm } from './settings-forms';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function SettingsPage() {
  await requireAdminPage('manageSettings');
  const t = await getTranslations('admin.settings');
  const s = await getSettings();
  const integrations = [
    { label: t('emailOn'), on: !!process.env.RESEND_API_KEY },
    { label: t('waOn'), on: !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) },
    { label: t('storageOn'), on: !!process.env.S3_BUCKET },
  ];
  return (
    <>
      <PageHeader title={t('title')} />
      <div className="grid gap-6 xl:grid-cols-2">
        <PaymentSettingsForm initial={s.payments} />
        <div className="space-y-6">
          <StoreSettingsForm initial={s.store} />
          <Card title={t('integrations')}>
            <ul className="space-y-2">
              {integrations.map((i) => (
                <li key={i.label} className="flex items-center justify-between">
                  <span className="t-body">{i.label}</span>
                  <StatusBadge tone={i.on ? 'success' : 'outline'}>{i.on ? t('configured') : t('notConfigured')}</StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
