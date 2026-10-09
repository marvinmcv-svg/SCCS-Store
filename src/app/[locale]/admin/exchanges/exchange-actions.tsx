'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toaster';
import { resolveExchange } from '@/actions/admin/exchanges';

export function ExchangeActions({ id, status }: { id: string; status: 'REQUESTED' | 'APPROVED' }) {
  const t = useTranslations('admin.exchanges');
  const te = useTranslations('errors');
  const router = useRouter();
  const [resolution, setResolution] = React.useState('');
  const [restock, setRestock] = React.useState(true);
  const [pending, setPending] = React.useState<string | null>(null);
  const go = async (s: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    setPending(s);
    const res = await resolveExchange({ id, status: s, resolution: resolution || undefined, restock: s === 'COMPLETED' && restock });
    setPending(null);
    if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
    toast(t('updated'));
    router.refresh();
  };
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4">
      <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder={t('resolution')} aria-label={t('resolution')} className="bg-bg" />
      <Toggle label={t('restock')} checked={restock} onCheckedChange={setRestock} />
      <div className="flex flex-wrap gap-2">
        {status === 'REQUESTED' && (
          <Button size="sm" loading={pending === 'APPROVED'} onClick={() => go('APPROVED')}>
            {t('approve')}
          </Button>
        )}
        <Button size="sm" variant="secondary" loading={pending === 'COMPLETED'} onClick={() => go('COMPLETED')}>
          {t('complete')}
        </Button>
        <Button size="sm" variant="ghost" className="text-red" loading={pending === 'REJECTED'} onClick={() => go('REJECTED')}>
          {t('reject')}
        </Button>
      </div>
    </div>
  );
}
