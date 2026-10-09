'use client';

import * as React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { formatBs } from '@/lib/money';
import { formatDateTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { confirmPickup, findPickupOrder } from '@/actions/admin/orders';

type Found = Extract<Awaited<ReturnType<typeof findPickupOrder>>, { ok: true }>['data'];

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  }
}

/**
 * Camera QR scanner. Uses the native BarcodeDetector where available
 * (Chrome/Android, Safari 17+), falling back to jsQR on a canvas.
 */
export function PickupScanner() {
  const t = useTranslations();
  const locale = useLocale();
  const video = React.useRef<HTMLVideoElement>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const stream = React.useRef<MediaStream | null>(null);
  const raf = React.useRef<number>(0);
  const [scanning, setScanning] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [order, setOrder] = React.useState<Found | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setScanning(false);
  }, []);

  React.useEffect(() => stop, [stop]);

  async function lookup(value: string) {
    setError(null);
    const res = await findPickupOrder(value);
    if (!res.ok) {
      haptic('error');
      setOrder(null);
      return setError(t('admin.pickup.notFound'));
    }
    haptic('success');
    setOrder(res.data);
  }

  async function start() {
    setError(null);
    setOrder(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      await v.play();
      setScanning(true);
      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      const tick = async () => {
        if (!stream.current) return;
        let value: string | null = null;
        if (detector) {
          const r = await detector.detect(v).catch(() => []);
          value = r[0]?.rawValue ?? null;
        } else if (jsQR && canvas.current && v.videoWidth) {
          const c = canvas.current;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(v, 0, 0);
          value = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
        }
        if (value) {
          stop();
          await lookup(value);
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch {
      setError(t('admin.pickup.cameraError'));
      stop();
    }
  }

  const status = order?.status;
  const canHandOver = order && status === 'READY' && (order.paymentMethod === 'CASH' || order.paymentStatus === 'VERIFIED');

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#0b0b1a]">
        <video ref={video} playsInline muted className={`h-full w-full object-cover ${scanning ? '' : 'hidden'}`} />
        <canvas ref={canvas} className="hidden" />
        {!scanning && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
            <div>
              <svg viewBox="0 0 24 24" className="mx-auto size-12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M8 12h8" />
              </svg>
              <Button variant="inverse" className="mt-4" onClick={start}>
                {t('admin.pickup.start')}
              </Button>
            </div>
          </div>
        )}
        {scanning && (
          <>
            <div className="pointer-events-none absolute inset-[18%] rounded-[20px] ring-2 ring-white/80" />
            <Button variant="inverse" size="sm" className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={stop}>
              {t('admin.pickup.stop')}
            </Button>
          </>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void lookup(code.trim());
        }}
      >
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SC-7K2Q9" aria-label={t('admin.pickup.manual')} className="font-mono" />
        <Button type="submit" variant="secondary">
          {t('admin.pickup.find')}
        </Button>
      </form>
      {error && (
        <p role="alert" className="t-caption rounded-[10px] bg-red-soft p-3 text-red">
          {error}
        </p>
      )}

      {order && (
        <div className="rounded-[16px] bg-bg-subtle p-5 animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[22px] font-medium">{order.code}</p>
              <p className="t-body">
                {t('admin.orders.pickupBy')}: <b>{order.pickupName}</b> · {order.pickupPhone}
              </p>
            </div>
            <p className="t-title tabular">{formatBs(order.totalCents)}</p>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-[10px] bg-bg p-2">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-[6px] bg-bg-subtle">{i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-contain p-1" />}</span>
                <span className="t-caption">
                  <b className="t-body block">
                    {i.qty}× {i.name}
                  </b>
                  {t('product.size')} {i.size}
                  {i.student && ` · ${i.student}`}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {status === 'PICKED_UP' ? (
              <p className="t-body rounded-[10px] bg-success-soft p-3 text-success">{t('admin.pickup.alreadyPicked', { date: order.pickedUpAt ? formatDateTime(order.pickedUpAt, locale) : '' })}</p>
            ) : !canHandOver ? (
              <p className="t-body rounded-[10px] bg-warning-soft p-3 text-warning">{t('admin.pickup.notReady', { status: t(`order.status${status}` as 'order.statusREADY') })}</p>
            ) : (
              <Button
                size="lg"
                block
                loading={pending}
                onClick={async () => {
                  setPending(true);
                  const res = await confirmPickup(order.id);
                  setPending(false);
                  if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
                  haptic('success');
                  toast(t('admin.pickup.done', { name: order.pickupName }));
                  setOrder({ ...order, status: 'PICKED_UP', pickedUpAt: new Date().toISOString() });
                }}
              >
                {order.paymentMethod === 'CASH' && order.paymentStatus !== 'VERIFIED' ? t('admin.pickup.collect', { amount: formatBs(order.totalCents) }) : t('admin.pickup.confirm')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
