'use client';

import * as React from 'react';
import { ViewTransition } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Img = { url: string; blur: string | null; alt: string | null };

/**
 * Mobile: full-width swipe gallery (native scroll-snap) with dots.
 * Desktop: two-column image grid (On style). Tap any image for a
 * fullscreen viewer with pinch / double-tap zoom.
 */
export function Gallery({ images, name, slug }: { images: Img[]; name: string; slug: string }) {
  const t = useTranslations('product');
  const track = React.useRef<HTMLDivElement>(null);
  const [index, setIndex] = React.useState(0);
  const [zoomAt, setZoomAt] = React.useState<number | null>(null);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const img = (i: Img, k: number, sizes: string, cls?: string) => (
    <Image
      src={i.url}
      alt={i.alt || `${name} · ${t('image', { index: k + 1, total: images.length })}`}
      fill
      sizes={sizes}
      priority={k === 0}
      placeholder={i.blur ? 'blur' : 'empty'}
      blurDataURL={i.blur ?? undefined}
      className={cn('object-contain', cls)}
    />
  );

  return (
    <>
      {/* Mobile swipe gallery */}
      <div className="relative md:hidden">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-roledescription="carousel" aria-label={name}>
          {images.map((i, k) => (
            <button
              key={i.url}
              type="button"
              onClick={() => setZoomAt(k)}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-bg-subtle"
              aria-label={`${t('zoom')} · ${t('image', { index: k + 1, total: images.length })}`}
            >
              {k === 0 ? (
                <ViewTransition name={`product-${slug}`} share="morph" default="none">
                  <div className="absolute inset-0">{img(i, k, '100vw', 'p-[8%]')}</div>
                </ViewTransition>
              ) : (
                img(i, k, '100vw', k === 1 ? 'object-cover' : 'p-[8%]')
              )}
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {images.map((_, k) => (
              <span key={k} className={cn('h-1.5 rounded-full transition-all duration-300', k === index ? 'w-5 bg-ink' : 'w-1.5 bg-ink/25')} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop grid */}
      <div className="hidden grid-cols-2 gap-2 md:grid">
        {images.map((i, k) => (
          <button
            key={i.url}
            type="button"
            onClick={() => setZoomAt(k)}
            className={cn('pressable relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[3px] bg-bg-subtle', images.length === 1 && 'col-span-2')}
            aria-label={`${t('zoom')} · ${t('image', { index: k + 1, total: images.length })}`}
          >
            {k === 0 ? (
              <ViewTransition name={`product-${slug}-lg`} share="morph" default="none">
                <div className="absolute inset-0">{img(i, k, '(min-width: 1280px) 30vw, 40vw', 'p-[8%]')}</div>
              </ViewTransition>
            ) : (
              img(i, k, '(min-width: 1280px) 30vw, 40vw', k === 1 ? 'object-cover' : 'p-[8%]')
            )}
          </button>
        ))}
      </div>

      <ZoomViewer images={images} name={name} start={zoomAt} onClose={() => setZoomAt(null)} />
    </>
  );
}

function ZoomViewer({ images, name, start, onClose }: { images: Img[]; name: string; start: number | null; onClose: () => void }) {
  const t = useTranslations('common');
  const [i, setI] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null);
  const lastTap = React.useRef(0);

  const [prevStart, setPrevStart] = React.useState<number | null>(null);
  if (start !== prevStart) {
    setPrevStart(start);
    if (start !== null) {
      setI(start);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    } else {
      const now = Date.now();
      if (now - lastTap.current < 280) {
        if (scale > 1) reset();
        else setScale(2.5);
      }
      lastTap.current = now;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setScale(Math.min(4, Math.max(1, (pinch.current.scale * d) / pinch.current.dist)));
    } else if (scale > 1) {
      setOffset((o) => ({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (scale <= 1.02) reset();
  };

  const go = (d: number) => {
    setI((v) => (v + d + images.length) % images.length);
    reset();
  };

  return (
    <Dialog.Root open={start !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-sheet)] bg-bg" />
        <Dialog.Content className="fixed inset-0 z-[var(--z-sheet)] flex flex-col outline-none" onKeyDown={(e) => (e.key === 'ArrowRight' ? go(1) : e.key === 'ArrowLeft' ? go(-1) : null)}>
          <Dialog.Title className="sr-only">{name}</Dialog.Title>
          <Dialog.Description className="sr-only">{name}</Dialog.Description>
          <div className="flex items-center justify-between p-2">
            <span className="t-label px-3 text-ink-2">
              {i + 1} / {images.length}
            </span>
            <Dialog.Close className="pressable grid size-11 place-items-center rounded-full hover:bg-bg-subtle" aria-label={t('close')}>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Dialog.Close>
          </div>
          <div
            className="relative flex-1 touch-none overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => setScale((s) => Math.min(4, Math.max(1, s - e.deltaY * 0.002)))}
          >
            {images[i] && (
              <div className="absolute inset-0 transition-transform duration-150 ease-out" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
                <Image src={images[i].url} alt={images[i].alt || name} fill sizes="100vw" className="object-contain p-4" quality={90} />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="safe-bottom flex justify-center gap-3 p-4">
              <button type="button" onClick={() => go(-1)} className="pressable grid size-12 place-items-center rounded-full bg-bg-subtle" aria-label={t('prev')}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>
              <button type="button" onClick={() => go(1)} className="pressable grid size-12 place-items-center rounded-full bg-bg-subtle" aria-label={t('next')}>
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
