'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { Card } from '@/components/admin/ui';
import { inviteStaff, setUserDisabled, setUserRole } from '@/actions/admin/store';

const ROLES = ['CUSTOMER', 'STAFF', 'ADMIN', 'OWNER'] as const;

export function InviteForm() {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [v, setV] = React.useState({ name: '', email: '', role: 'STAFF' as 'STAFF' | 'ADMIN' | 'OWNER' });
  const [pending, setPending] = React.useState(false);
  return (
    <Card title={t('users.invite')}>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await inviteStaff(v);
          setPending(false);
          if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
          toast(t('users.invited'));
          setV({ name: '', email: '', role: 'STAFF' });
          router.refresh();
        }}
      >
        <Field label={t('users.name')} htmlFor="inv-name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required className="bg-bg" /></Field>
        <Field label={t('users.email')} htmlFor="inv-email"><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required className="bg-bg" /></Field>
        <Field label={t('users.role')} htmlFor="inv-role">
          <Select value={v.role} onChange={(e) => setV({ ...v, role: e.target.value as typeof v.role })} className="bg-bg">
            {(['STAFF', 'ADMIN', 'OWNER'] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
          </Select>
        </Field>
        <Button type="submit" loading={pending} className="h-12">{t('users.invite')}</Button>
      </form>
    </Card>
  );
}

export function UserRowActions({ id, role, disabled }: { id: string; role: (typeof ROLES)[number]; disabled: boolean }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const done = (res: { ok: boolean; error?: string }) => {
    if (!res.ok) return toast.error(te((res.error ?? 'UNKNOWN') as 'UNKNOWN'));
    toast(t('users.saved'));
    router.refresh();
  };
  return (
    <span className="inline-flex items-center gap-2">
      <select value={role} onChange={async (e) => done(await setUserRole(id, e.target.value as (typeof ROLES)[number]))} className="h-9 rounded-full bg-bg-subtle px-3 text-[13px]" aria-label={t('users.role')}>
        {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </select>
      <Button size="sm" variant="ghost" className={disabled ? '' : 'text-red'} onClick={async () => done(await setUserDisabled(id, !disabled))}>
        {disabled ? t('users.enable') : t('users.disable')}
      </Button>
    </span>
  );
}
