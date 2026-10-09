'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Banner, Announcement } from '@prisma/client';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { Card } from '@/components/admin/ui';
import { saveAnnouncement, saveBanner, saveCollection, savePromo, uploadBannerImage } from '@/actions/admin/store';

function useSaver() {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const save = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setPending(true);
    const res = await fn();
    setPending(false);
    if (!res.ok) return toast.error(te((res.error ?? 'UNKNOWN') as 'UNKNOWN'));
    toast(t('content.saved'));
    router.refresh();
  };
  return { pending, save };
}

export function BannerEditor({ banner }: { banner: Banner }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const [b, setB] = React.useState(banner);
  const { pending, save } = useSaver();
  const f = (k: keyof Banner) => ({ value: String(b[k] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement>) => setB({ ...b, [k]: e.target.value }), className: 'bg-bg' });
  const upload = async (field: 'imageMobile' | 'imageDesktop', file?: File) => {
    if (!file) return;
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadBannerImage(b.id, field, fd);
    if (!res.ok) return toast.error(te(res.error as 'UNKNOWN'));
    setB({ ...b, [field]: res.data.url });
  };
  return (
    <Card title={b.placement === 'home-hero' ? t('content.placementHero') : t('content.placementEditorial')} actions={<Toggle checked={b.active} onCheckedChange={(c) => setB({ ...b, active: c })} aria-label={t('common.active')} />}>
      <div className="mb-4 grid grid-cols-[1fr_2fr] gap-3">
        {(['imageMobile', 'imageDesktop'] as const).map((k) => (
          <label key={k} className="pressable relative block cursor-pointer overflow-hidden rounded-[10px] bg-bg" style={{ aspectRatio: k === 'imageMobile' ? '3/4' : '2/1' }}>
            <Image src={b[k]} alt="" fill sizes="300px" className="object-cover" />
            <span className="t-label absolute inset-x-0 bottom-0 bg-black/50 p-1.5 text-center text-[9px] text-white">{t(`content.${k}`)}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(k, e.target.files?.[0])} />
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('content.eyebrow')} (ES)`} htmlFor={`${b.id}-ee`}><Input {...f('eyebrowEs')} /></Field>
        <Field label={`${t('content.eyebrow')} (EN)`} htmlFor={`${b.id}-ei`}><Input {...f('eyebrowEn')} /></Field>
        <Field label={`${t('content.titleField')} (ES)`} htmlFor={`${b.id}-te`}><Input {...f('titleEs')} /></Field>
        <Field label={`${t('content.titleField')} (EN)`} htmlFor={`${b.id}-ti`}><Input {...f('titleEn')} /></Field>
        <Field label={`${t('content.subtitle')} (ES)`} htmlFor={`${b.id}-se`}><Input {...f('subtitleEs')} /></Field>
        <Field label={`${t('content.subtitle')} (EN)`} htmlFor={`${b.id}-si`}><Input {...f('subtitleEn')} /></Field>
        <Field label={`${t('content.cta')} (ES)`} htmlFor={`${b.id}-ce`}><Input {...f('ctaLabelEs')} /></Field>
        <Field label={`${t('content.cta')} (EN)`} htmlFor={`${b.id}-ci`}><Input {...f('ctaLabelEn')} /></Field>
        <Field label={t('content.href')} htmlFor={`${b.id}-h`} className="sm:col-span-2"><Input {...f('href')} /></Field>
      </div>
      <Button className="mt-4" loading={pending} onClick={() => save(() => saveBanner({ id: b.id, eyebrowEs: b.eyebrowEs, eyebrowEn: b.eyebrowEn, titleEs: b.titleEs, titleEn: b.titleEn, subtitleEs: b.subtitleEs, subtitleEn: b.subtitleEn, ctaLabelEs: b.ctaLabelEs, ctaLabelEn: b.ctaLabelEn, href: b.href, active: b.active }))}>
        {t('common.save')}
      </Button>
    </Card>
  );
}

export function CollectionEditor({ collection, products }: { collection: { id: string; titleEs: string; titleEn: string; productIds: string[] }; products: { id: string; name: string }[] }) {
  const t = useTranslations('admin');
  const [ids, setIds] = React.useState(collection.productIds);
  const [titles, setTitles] = React.useState({ es: collection.titleEs, en: collection.titleEn });
  const [add, setAdd] = React.useState('');
  const { pending, save } = useSaver();
  const move = (i: number, d: number) => {
    const n = [...ids];
    const [x] = n.splice(i, 1);
    n.splice(Math.max(0, Math.min(n.length, i + d)), 0, x);
    setIds(n);
  };
  return (
    <Card>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label={`${t('content.titleField')} (ES)`} htmlFor={`${collection.id}-es`}>
          <Input value={titles.es} onChange={(e) => setTitles({ ...titles, es: e.target.value })} className="bg-bg" />
        </Field>
        <Field label={`${t('content.titleField')} (EN)`} htmlFor={`${collection.id}-en`}>
          <Input value={titles.en} onChange={(e) => setTitles({ ...titles, en: e.target.value })} className="bg-bg" />
        </Field>
      </div>
      <ol className="space-y-1.5">
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-[10px] bg-bg px-3 py-2">
            <span className="t-label w-5 text-ink-3">{i + 1}</span>
            <span className="t-body flex-1">{products.find((p) => p.id === id)?.name ?? id}</span>
            <button type="button" className="pressable grid size-8 place-items-center rounded-full hover:bg-bg-subtle" onClick={() => move(i, -1)} aria-label="↑">↑</button>
            <button type="button" className="pressable grid size-8 place-items-center rounded-full hover:bg-bg-subtle" onClick={() => move(i, 1)} aria-label="↓">↓</button>
            <button type="button" className="pressable grid size-8 place-items-center rounded-full hover:bg-bg-subtle" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label={t('common.delete')}>✕</button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <select value={add} onChange={(e) => setAdd(e.target.value)} className="h-10 flex-1 rounded-full bg-bg px-4 text-[14px]" aria-label={t('content.addProduct')}>
          <option value="">{t('content.addProduct')}…</option>
          {products.filter((p) => !ids.includes(p.id)).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Button variant="secondary" disabled={!add} onClick={() => { setIds([...ids, add]); setAdd(''); }}>+</Button>
      </div>
      <Button className="mt-4" loading={pending} onClick={() => save(() => saveCollection(collection.id, ids, titles.es, titles.en))}>
        {t('common.save')}
      </Button>
    </Card>
  );
}

export function AnnouncementEditor({ announcement }: { announcement: Announcement | null }) {
  const t = useTranslations('admin');
  const [a, setA] = React.useState({ id: announcement?.id, textEs: announcement?.textEs ?? '', textEn: announcement?.textEn ?? '', href: announcement?.href ?? '', active: announcement?.active ?? true });
  const { pending, save } = useSaver();
  return (
    <Card actions={<Toggle checked={a.active} onCheckedChange={(c) => setA({ ...a, active: c })} aria-label={t('common.active')} />}>
      <div className="space-y-3">
        <Field label={`${t('content.text')} (ES)`} htmlFor="a-es"><Input value={a.textEs} onChange={(e) => setA({ ...a, textEs: e.target.value })} className="bg-bg" /></Field>
        <Field label={`${t('content.text')} (EN)`} htmlFor="a-en"><Input value={a.textEn} onChange={(e) => setA({ ...a, textEn: e.target.value })} className="bg-bg" /></Field>
        <Field label={t('content.href')} htmlFor="a-href"><Input value={a.href} onChange={(e) => setA({ ...a, href: e.target.value })} className="bg-bg" /></Field>
      </div>
      <Button className="mt-4" loading={pending} onClick={() => save(() => saveAnnouncement(a))}>{t('common.save')}</Button>
    </Card>
  );
}

type Promo = { id?: string; code: string; pct: number | null; amountCents: number | null; maxUses: number | null; uses?: number; active: boolean; expiresAt: string | null };

export function PromoEditor({ promos }: { promos: Promo[] }) {
  const t = useTranslations('admin');
  const [draft, setDraft] = React.useState<Promo>({ code: '', pct: 10, amountCents: null, maxUses: null, active: true, expiresAt: null });
  const { pending, save } = useSaver();
  return (
    <Card>
      <ul className="mb-4 divide-y divide-line">
        {promos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <span>
              <span className="font-mono font-medium">{p.code}</span>
              <span className="t-caption block text-ink-2">
                {p.pct ? `${p.pct}%` : `Bs ${(p.amountCents ?? 0) / 100}`} · {t('content.uses')} {p.uses}
                {p.maxUses ? `/${p.maxUses}` : ''}
                {p.expiresAt && ` · ${t('content.expires')} ${p.expiresAt}`}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tone={p.active ? 'success' : 'subtle'}>{p.active ? t('common.active') : t('common.inactive')}</Badge>
              <Toggle checked={p.active} onCheckedChange={(c) => save(() => savePromo({ ...p, active: c }))} aria-label={p.code} />
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('content.code')} htmlFor="pr-code"><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} className="bg-bg font-mono" /></Field>
        <Field label={t('content.pct')} htmlFor="pr-pct"><Input inputMode="numeric" value={draft.pct ?? ''} onChange={(e) => setDraft({ ...draft, pct: Number(e.target.value) || null, amountCents: null })} className="bg-bg" /></Field>
        <Field label={t('content.amount')} htmlFor="pr-amt"><Input inputMode="decimal" value={draft.amountCents ? draft.amountCents / 100 : ''} onChange={(e) => setDraft({ ...draft, amountCents: Math.round(Number(e.target.value) * 100) || null, pct: null })} className="bg-bg" /></Field>
        <Field label={t('content.maxUses')} htmlFor="pr-max"><Input inputMode="numeric" value={draft.maxUses ?? ''} onChange={(e) => setDraft({ ...draft, maxUses: Number(e.target.value) || null })} className="bg-bg" /></Field>
        <Field label={t('content.expires')} htmlFor="pr-exp" className="col-span-2"><Input type="date" value={draft.expiresAt ?? ''} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })} className="bg-bg" /></Field>
      </div>
      <Button className="mt-4" loading={pending} disabled={draft.code.length < 3} onClick={() => save(() => savePromo(draft))}>{t('common.create')}</Button>
    </Card>
  );
}
