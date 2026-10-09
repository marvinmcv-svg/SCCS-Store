'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('common');
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-start justify-center py-16">
      <p className="t-label text-ink-2">{error.digest ?? 'Error'}</p>
      <h1 className="t-h1 mt-3">{t('errorTitle')}</h1>
      <p className="t-body mt-3 max-w-md text-ink-2">{t('errorBody')}</p>
      <Button className="mt-8" size="lg" onClick={reset}>
        {t('retry')}
      </Button>
    </div>
  );
}
