'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Card } from '@/components/admin/ui';
import { deleteProductImage, reorderProductImages, uploadProductImages } from '@/actions/admin/catalog';

type Img = { id: string; url: string };

/** Drag-and-drop upload + drag-to-reorder thumbnails. */
export function ImageManager({ productId, initial }: { productId: string; initial: Img[] }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const [images, setImages] = React.useState(initial);
  const [uploading, setUploading] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const drag = React.useRef<number | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setUploading(true);
    const fd = new FormData();
    list.forEach((f) => fd.append('files', f));
    const res = await uploadProductImages(productId, fd);
    setUploading(false);
    if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
    setImages(res.data.map((i) => ({ id: i.id, url: i.url })));
  }

  async function persist(next: Img[]) {
    setImages(next);
    const res = await reorderProductImages(
      productId,
      next.map((i) => i.id),
    );
    if (!res.ok) toast.error(te(res.error as 'UNKNOWN'));
  }

  return (
    <Card title={t('products.images')}>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={cn('rounded-[12px] border border-dashed p-4 transition-colors', over ? 'border-accent bg-accent-soft' : 'border-line-strong')}
      >
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
          {images.map((img, i) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => (drag.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = drag.current;
                drag.current = null;
                if (from === null || from === i) return;
                const next = [...images];
                const [moved] = next.splice(from, 1);
                next.splice(i, 0, moved);
                void persist(next);
              }}
              className="group relative aspect-[4/5] cursor-grab overflow-hidden rounded-[8px] bg-bg active:cursor-grabbing"
            >
              <Image src={img.url} alt="" fill sizes="120px" className="object-contain p-1" />
              {i === 0 && <span className="t-label absolute top-1 left-1 rounded bg-ink px-1.5 py-0.5 text-[9px] text-bg">1</span>}
              <button
                type="button"
                onClick={async () => {
                  const res = await deleteProductImage(img.id);
                  if (res.ok) setImages((cur) => cur.filter((c) => c.id !== img.id));
                }}
                className="pressable absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-bg/90 text-[12px] opacity-100 shadow-1 md:opacity-0 md:group-hover:opacity-100"
                aria-label={t('common.delete')}
              >
                ✕
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={uploading}
              className="pressable grid aspect-[4/5] w-full place-items-center rounded-[8px] bg-bg text-center text-[12px] text-ink-2 ring-1 ring-line ring-inset hover:text-ink"
            >
              {uploading ? t('products.uploading') : `+ ${t('products.upload')}`}
            </button>
          </li>
        </ul>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => e.target.files && upload(e.target.files)} />
        <p className="t-caption mt-3 text-ink-2">{t('products.imagesHint')}</p>
      </div>
    </Card>
  );
}
