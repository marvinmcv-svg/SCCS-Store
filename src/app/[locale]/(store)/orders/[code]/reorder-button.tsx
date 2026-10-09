'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { reorder } from '@/actions/orders';
import { useStore } from '@/components/store/store-provider';

export function ReorderButton({ code, variant = 'secondary', size = 'md' }: { code: string; variant?: 'secondary' | 'primary'; size?: 'sm' | 'md' }) {
  const t = useTranslations();
  const router = useRouter();
  const { setCount } = useStore();
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      className="mt-6"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await reorder(code);
        setPending(false);
        if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
        setCount(res.data.count);
        toast(t('order.reordered'), { action: { label: t('product.viewBag'), onClick: () => router.push('/bag') } });
        router.refresh();
      }}
    >
      {t('order.reorder')}
    </Button>
  );
}
