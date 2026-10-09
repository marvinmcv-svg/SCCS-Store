'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { toast } from '@/components/ui/toaster';
import { rejectPayment, resendNotification, setOrderStatus, verifyPayment } from '@/actions/admin/orders';

export function OrderActions({ orderId, status, next, paymentMethod, paymentStatus }: { orderId: string; status: OrderStatus; next: OrderStatus[]; paymentMethod: PaymentMethod; paymentStatus: PaymentStatus }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');

  async function go(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setPending(key);
    const res = await fn();
    setPending(null);
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    toast(msg);
    router.refresh();
  }

  const forward = next.filter((s) => s !== 'CANCELLED' && !(s === 'PAYMENT_VERIFIED' && paymentStatus !== 'VERIFIED') && !(s === 'PREPARING' && status === 'RECEIVED' && paymentMethod !== 'CASH'));
  const closed = status === 'CANCELLED' || status === 'EXPIRED' || status === 'PICKED_UP';

  return (
    <div className="flex flex-wrap gap-2 rounded-[14px] bg-bg-subtle p-4">
      {paymentStatus !== 'VERIFIED' && paymentMethod !== 'CASH' && !closed && (
        <Button loading={pending === 'verify'} onClick={() => go('verify', () => verifyPayment(orderId), t('admin.orders.verified'))}>
          {t('admin.orders.verify')}
        </Button>
      )}
      {forward.map((s) => (
        <Button key={s} variant={s === 'READY' || s === 'PICKED_UP' ? 'primary' : 'secondary'} loading={pending === s} onClick={() => go(s, () => setOrderStatus(orderId, s), t('admin.orders.statusChanged'))}>
          {t('admin.orders.moveTo', { status: t(`order.status${s}`) })}
        </Button>
      ))}
      <Button variant="ghost" loading={pending === 'resend'} onClick={() => go('resend', () => resendNotification(orderId), t('admin.orders.resent'))}>
        {t('admin.orders.resend')}
      </Button>
      {next.includes('CANCELLED') && (
        <Button variant="ghost" className="text-red" onClick={() => setCancelOpen(true)}>
          {t('admin.orders.cancel')}
        </Button>
      )}
      <BottomSheet open={cancelOpen} onOpenChange={setCancelOpen} title={t('admin.orders.cancel')}>
        <div className="space-y-4">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.orders.cancelReason')} aria-label={t('admin.orders.cancelReason')} />
          <Button
            variant="danger"
            size="lg"
            block
            loading={pending === 'cancel'}
            onClick={async () => {
              await go('cancel', () => setOrderStatus(orderId, 'CANCELLED', reason || undefined), t('admin.orders.cancelled'));
              setCancelOpen(false);
            }}
          >
            {t('admin.common.confirm')}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export function ProofActions({ orderId, proofId }: { orderId: string; proofId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [reason, setReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  return (
    <div className="mt-4 space-y-3">
      {rejecting && <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('admin.orders.rejectReasonPh')} aria-label={t('admin.orders.rejectReason')} autoFocus />}
      <div className="flex gap-2">
        {!rejecting && (
          <Button
            loading={pending}
            onClick={async () => {
              setPending(true);
              const res = await verifyPayment(orderId, proofId);
              setPending(false);
              if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
              toast(t('admin.orders.verified'));
              router.refresh();
            }}
          >
            {t('admin.orders.verify')}
          </Button>
        )}
        <Button
          variant={rejecting ? 'danger' : 'secondary'}
          loading={pending && rejecting}
          onClick={async () => {
            if (!rejecting) return setRejecting(true);
            if (reason.trim().length < 3) return toast.error(t('admin.orders.rejectReason'));
            setPending(true);
            const res = await rejectPayment(orderId, proofId, reason);
            setPending(false);
            if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
            toast(t('admin.orders.rejected'));
            router.refresh();
          }}
        >
          {t('admin.orders.reject')}
        </Button>
        {rejecting && (
          <Button variant="ghost" onClick={() => setRejecting(false)}>
            {t('admin.common.cancel')}
          </Button>
        )}
      </div>
    </div>
  );
}
