'use client';

import * as React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { toast } from '@/components/ui/toaster';
import { Card } from '@/components/admin/ui';
import { GRADES, gradeLabel } from '@/config/catalog';
import { saveBundle, uploadBundleImage, type BundleInput } from '@/actions/admin/catalog';

const empty: BundleInput = { nameEs: '', nameEn: '', descEs: '', descEn: '', grades: [], fit: 'UNISEX', discountPct: 10, status: 'DRAFT', items: [] };

export function BundleForm({ products, initial, image }: { products: { id: string; name: string }[]; initial?: BundleInput; image: string | null }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [v, setV] = React.useState<BundleInput>(initial ?? empty);
  const [img, setImg] = React.useState(image);
  const [pending, setPending] = React.useState(false);
  const set = <K extends keyof BundleInput>(k: K, val: BundleInput[K]) => setV((x) => ({ ...x, [k]: val }));

  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await saveBundle(v);
        setPending(false);
        if (!res.ok) return toast.error(res.fields ? JSON.stringify(res.fields) : te(res.error as 'UNKNOWN'));
        toast(initial?.id ? t('bundles.saved') : t('bundles.created'));
        if (!initial?.id) router.replace(`/admin/bundles/${res.data.id}`);
        else router.refresh();
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('products.nameEs')} htmlFor="b-es">
              <Input value={v.nameEs} onChange={(e) => set('nameEs', e.target.value)} required className="bg-bg" />
            </Field>
            <Field label={t('products.nameEn')} htmlFor="b-en">
              <Input value={v.nameEn} onChange={(e) => set('nameEn', e.target.value)} required className="bg-bg" />
            </Field>
            <Field label={t('products.descEs')} htmlFor="b-des">
              <Textarea value={v.descEs} onChange={(e) => set('descEs', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('products.descEn')} htmlFor="b-den">
              <Textarea value={v.descEn} onChange={(e) => set('descEn', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('bundles.discount')} htmlFor="b-disc">
              <Input inputMode="numeric" value={v.discountPct} onChange={(e) => set('discountPct', Number(e.target.value.replace(/\D/g, '')) || 0)} className="bg-bg" />
            </Field>
            <Field label={t('products.status')} htmlFor="b-status">
              <Select value={v.status} onChange={(e) => set('status', e.target.value as BundleInput['status'])} className="bg-bg">
                {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`products.status${s}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <p className="t-label mt-5 mb-2 text-ink-2">{t('products.grades')}</p>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map((g) => (
              <button key={g} type="button" aria-pressed={v.grades.includes(g)} onClick={() => set('grades', v.grades.includes(g) ? v.grades.filter((x) => x !== g) : [...v.grades, g])} className={`pressable h-9 rounded-full px-3 text-[13px] ring-1 ring-inset ${v.grades.includes(g) ? 'bg-ink text-bg ring-ink' : 'ring-line-strong'}`}>
                {gradeLabel(g, locale)}
              </button>
            ))}
          </div>
        </Card>
        <Card title={t('bundles.image')}>
          <label className="pressable relative block aspect-[4/5] cursor-pointer overflow-hidden rounded-[10px] bg-bg ring-1 ring-line ring-inset">
            {img ? <Image src={img} alt="" fill sizes="320px" className="object-cover" /> : <span className="t-caption absolute inset-0 grid place-items-center text-ink-2">+ {t('products.upload')}</span>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={!initial?.id}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !initial?.id) return;
                const fd = new FormData();
                fd.set('file', f);
                const res = await uploadBundleImage(initial.id, fd);
                if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
                setImg(res.data.url);
              }}
            />
          </label>
        </Card>
      </div>
      <Card
        title={t('bundles.items')}
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => set('items', [...v.items, { productId: products[0]?.id ?? '', qty: 1, optional: false }])}>
            + {t('bundles.addItem')}
          </Button>
        }
      >
        <ul className="space-y-2">
          {v.items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 rounded-[10px] bg-bg p-3">
              <select
                value={it.productId}
                onChange={(e) => set('items', v.items.map((x, k) => (k === i ? { ...x, productId: e.target.value } : x)))}
                className="h-10 min-w-0 flex-1 rounded-[8px] bg-bg-subtle px-3 text-[14px]"
                aria-label={t('bundles.product')}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input inputMode="numeric" value={it.qty} onChange={(e) => set('items', v.items.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value.replace(/\D/g, '')) || 1 } : x)))} className="h-10 w-16 rounded-[8px] bg-bg-subtle px-2 text-center" aria-label={t('bundles.qty')} />
              <Toggle label={t('bundles.optional')} checked={it.optional} onCheckedChange={(c) => set('items', v.items.map((x, k) => (k === i ? { ...x, optional: c } : x)))} />
              <button type="button" onClick={() => set('items', v.items.filter((_, k) => k !== i))} className="pressable grid size-9 place-items-center rounded-full hover:bg-bg-subtle" aria-label={t('common.delete')}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Button type="submit" size="lg" loading={pending}>
        {t('common.save')}
      </Button>
    </form>
  );
}
