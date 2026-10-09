'use client';

import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';

export function SignOutButton() {
  const t = useTranslations('profile');
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" loading={pending} onClick={() => start(() => signOutAction())}>
      {t('signOut')}
    </Button>
  );
}
