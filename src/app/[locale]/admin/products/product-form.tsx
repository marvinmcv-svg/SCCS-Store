'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { Chip } from '@/components/ui/chip';
import { toast } from '@/components/ui/toaster';
import { GARMENT_LABELS, GARMENT_TYPES, GRADES, KID_SIZES, ADULT_SIZES, gradeLabel, DIVISIONS } from '@/config/catalog';
import { saveProduct, archiveProduct, type ProductInput } from '@/actions/admin/catalog';
import { Card } from '@/components/admin/ui';

type V = ProductInput['variants'][number] & { stock?: number; key: string };
type Initial = Omit<ProductInput, 'variants'> & { variants: (ProductInput['variants'][number] & { stock?: number })[] };

const empty: Initial = {
  nameEs: '',
  nameEn: '',
  descEs: '',
  descEn: '',
  careEs: '',
  careEn: '',
  categoryId: '',
  garmentType: null,
  grades: [],
  fit: 'UNISEX',
  status: 'DRAFT',
  featured: false,
  isNew: true,
  isUniform: false,
  allowPreorder: false,
  preorderDate: null,
  tags: [],
  variants: [],
};

let k = 0;
const key = () => `v${++k}`;

export function ProductForm({ categories, initial }: { categories: { id: string; name: string }[]; initial?: Initial }) {
  const t = useTranslations('admin');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const [v, setV] = React.useState<Initial>(() => initial ?? { ...empty, categoryId: categories[0]?.id ?? '' });
  const [variants, setVariants] = React.useState<V[]>(() => (initial?.variants ?? []).map((x) => ({ ...x, key: key() })));
  const [tags, setTags] = React.useState((initial?.tags ?? []).join(', '));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = <K extends keyof Initial>(k2: K, val: Initial[K]) => setV((x) => ({ ...x, [k2]: val }));

  const baseSku = (v.slug || v.nameEs)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\W+/)
    .filter(Boolean)
    .map((p) => p.slice(0, 3))
    .join('')
    .toUpperCase()
    .slice(0, 12);

  function genSizes(kind: 'kids' | 'adult' | 'one') {
    const sizes = kind === 'kids' ? [...KID_SIZES] : kind === 'adult' ? [...ADULT_SIZES] : ['U'];
    const tpl = variants[0];
    setVariants((cur) => [
      ...cur,
      ...sizes
        .filter((s) => !cur.some((c) => c.size === s && c.active))
        .map((s) => ({
          key: key(),
          sku: `${baseSku || 'SKU'}-${s}`,
          size: s,
          color: tpl?.color ?? 'Blanco',
          colorHex: tpl?.colorHex ?? '#ffffff',
          priceCents: tpl?.priceCents ?? 0,
          compareAtCents: null,
          reorderPoint: 4,
          active: true,
          initialStock: 0,
        })),
    ]);
  }

  const upd = (key2: string, patch: Partial<V>) => setVariants((cur) => cur.map((x) => (x.key === key2 ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await saveProduct({
      ...v,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      variants: variants.map(({ key: _k, stock: _s, ...x }) => x),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.fields ? Object.entries(res.fields).map(([f, m]) => `${f}: ${m}`).join(' · ') : te(res.error as 'UNKNOWN'));
      return;
    }
    toast(initial?.id ? t('products.saved') : t('products.created'));
    if (!initial?.id) router.replace(`/admin/products/${res.data.id}`);
    else router.refresh();
  }

  const num = (s: string) => Math.round(Number(s.replace(',', '.')) * 100) || 0;
  const cell = 'h-10 w-full rounded-[8px] bg-bg px-2 text-[14px] outline-none ring-1 ring-inset ring-line focus:ring-2 focus:ring-accent';

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card title={t('products.basics')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('products.nameEs')} htmlFor="p-nameEs">
              <Input value={v.nameEs} onChange={(e) => set('nameEs', e.target.value)} required className="bg-bg" />
            </Field>
            <Field label={t('products.nameEn')} htmlFor="p-nameEn">
              <Input value={v.nameEn} onChange={(e) => set('nameEn', e.target.value)} required className="bg-bg" />
            </Field>
            <Field label={t('products.descEs')} htmlFor="p-descEs">
              <Textarea rows={5} value={v.descEs} onChange={(e) => set('descEs', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('products.descEn')} htmlFor="p-descEn">
              <Textarea rows={5} value={v.descEn} onChange={(e) => set('descEn', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('products.careEs')} htmlFor="p-careEs">
              <Textarea rows={3} value={v.careEs} onChange={(e) => set('careEs', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('products.careEn')} htmlFor="p-careEn">
              <Textarea rows={3} value={v.careEn} onChange={(e) => set('careEn', e.target.value)} className="bg-bg" />
            </Field>
            <Field label={t('products.category')} htmlFor="p-cat">
              <Select value={v.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="bg-bg">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('products.garment')} htmlFor="p-garment">
              <Select value={v.garmentType ?? ''} onChange={(e) => set('garmentType', (e.target.value || null) as Initial['garmentType'])} className="bg-bg">
                <option value="">{t('products.noGarment')}</option>
                {GARMENT_TYPES.map((g) => (
                  <option key={g} value={g}>
                    {GARMENT_LABELS[g][locale === 'en' ? 'en' : 'es']}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('products.fit')} htmlFor="p-fit">
              <Select value={v.fit} onChange={(e) => set('fit', e.target.value as Initial['fit'])} className="bg-bg">
                {(['UNISEX', 'BOYS', 'GIRLS'] as const).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('products.tags')} htmlFor="p-tags">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} className="bg-bg" />
            </Field>
          </div>
          <fieldset className="mt-5">
            <legend className="t-label mb-2 text-ink-2">
              {t('products.grades')} · {v.grades.length === 0 ? t('products.allGrades') : v.grades.length}
            </legend>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {DIVISIONS.map((d) => (
                <Chip key={d.id} size="sm" type="button" selected={d.grades.every((g) => v.grades.includes(g))} onClick={() => {
                  const on = d.grades.every((g) => v.grades.includes(g));
                  set('grades', on ? v.grades.filter((g) => !d.grades.includes(g)) : [...new Set([...v.grades, ...d.grades])] as Initial['grades']);
                }}>
                  {locale === 'en' ? d.en : d.es}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={v.grades.includes(g)}
                  onClick={() => set('grades', (v.grades.includes(g) ? v.grades.filter((x) => x !== g) : [...v.grades, g]) as Initial['grades'])}
                  className={`pressable h-9 rounded-full px-3 text-[13px] ring-1 ring-inset ${v.grades.includes(g) ? 'bg-ink text-bg ring-ink' : 'ring-line-strong'}`}
                >
                  {gradeLabel(g, locale)}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>
        <div className="space-y-6">
          <Card title={t('products.flags')}>
            <div className="space-y-3">
              <Field label={t('products.status')} htmlFor="p-status">
                <Select value={v.status} onChange={(e) => set('status', e.target.value as Initial['status'])} className="bg-bg">
                  {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as const).map((s) => (
                    <option key={s} value={s}>
                      {t(`products.status${s}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Toggle label={t('products.featured')} checked={v.featured} onCheckedChange={(c) => set('featured', c)} />
              <Toggle label={t('products.isNew')} checked={v.isNew} onCheckedChange={(c) => set('isNew', c)} />
              <Toggle label={t('products.isUniform')} checked={v.isUniform} onCheckedChange={(c) => set('isUniform', c)} />
              <Toggle label={t('products.preorder')} checked={v.allowPreorder} onCheckedChange={(c) => set('allowPreorder', c)} />
              {v.allowPreorder && (
                <Field label={t('products.preorderDate')} htmlFor="p-pre">
                  <Input type="date" value={v.preorderDate ?? ''} onChange={(e) => set('preorderDate', e.target.value || null)} className="bg-bg" />
                </Field>
              )}
            </div>
          </Card>
          <Card title={t('products.seo')}>
            <Field label={t('products.slug')} htmlFor="p-slug" hint={`/p/${v.slug || '…'}`}>
              <Input value={v.slug ?? ''} onChange={(e) => set('slug', e.target.value)} className="bg-bg font-mono" />
            </Field>
          </Card>
        </div>
      </div>

      <Card
        title={t('products.variants')}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="secondary" onClick={() => genSizes('kids')}>
              {t('products.genSizes')} 4–16
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => genSizes('adult')}>
              XS–XL
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => genSizes('one')}>
              U
            </Button>
          </div>
        }
      >
        <p className="t-caption mb-3 text-ink-2">{t('products.variantsHint')}</p>
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[860px] text-[14px]">
            <thead>
              <tr className="t-label text-left text-ink-2">
                <th className="py-2 pr-2">{t('products.size')}</th>
                <th className="py-2 pr-2">{t('products.sku')}</th>
                <th className="py-2 pr-2">{t('products.color')}</th>
                <th className="py-2 pr-2">{t('products.hex')}</th>
                <th className="py-2 pr-2">{t('products.price')}</th>
                <th className="py-2 pr-2">{t('products.compareAt')}</th>
                <th className="py-2 pr-2">{t('products.stock')}</th>
                <th className="py-2 pr-2">{t('products.reorder')}</th>
                <th className="py-2 pr-2">{t('common.active')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((x) => (
                <tr key={x.key} className={x.active ? '' : 'opacity-50'}>
                  <td className="py-1 pr-2">
                    <input className={`${cell} w-16`} value={x.size} onChange={(e) => upd(x.key, { size: e.target.value })} aria-label={t('products.size')} />
                  </td>
                  <td className="py-1 pr-2">
                    <input className={`${cell} font-mono`} value={x.sku} onChange={(e) => upd(x.key, { sku: e.target.value.toUpperCase() })} aria-label={t('products.sku')} />
                  </td>
                  <td className="py-1 pr-2">
                    <input className={cell} value={x.color} onChange={(e) => upd(x.key, { color: e.target.value })} aria-label={t('products.color')} />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="color" className="h-10 w-12 rounded-[8px] bg-bg" value={x.colorHex} onChange={(e) => upd(x.key, { colorHex: e.target.value })} aria-label={t('products.hex')} />
                  </td>
                  <td className="py-1 pr-2">
                    <input className={`${cell} w-24 tabular`} inputMode="decimal" defaultValue={(x.priceCents / 100).toFixed(2)} onBlur={(e) => upd(x.key, { priceCents: num(e.target.value) })} aria-label={t('products.price')} />
                  </td>
                  <td className="py-1 pr-2">
                    <input className={`${cell} w-24 tabular`} inputMode="decimal" defaultValue={x.compareAtCents ? (x.compareAtCents / 100).toFixed(2) : ''} onBlur={(e) => upd(x.key, { compareAtCents: e.target.value ? num(e.target.value) : null })} aria-label={t('products.compareAt')} />
                  </td>
                  <td className="py-1 pr-2">
                    {x.id ? (
                      <span className="tabular px-2">{x.stock}</span>
                    ) : (
                      <input className={`${cell} w-20 tabular`} inputMode="numeric" value={x.initialStock ?? 0} onChange={(e) => upd(x.key, { initialStock: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label={t('products.stock')} />
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    <input className={`${cell} w-16 tabular`} inputMode="numeric" value={x.reorderPoint} onChange={(e) => upd(x.key, { reorderPoint: Number(e.target.value.replace(/\D/g, '')) || 0 })} aria-label={t('products.reorder')} />
                  </td>
                  <td className="py-1 pr-2">
                    <Toggle checked={x.active} onCheckedChange={(c) => upd(x.key, { active: c })} aria-label={t('common.active')} />
                  </td>
                  <td className="py-1">
                    {!x.id && (
                      <button type="button" className="pressable grid size-9 place-items-center rounded-full text-ink-2 hover:bg-bg" onClick={() => setVariants((cur) => cur.filter((c) => c.key !== x.key))} aria-label={t('common.delete')}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => setVariants((cur) => [...cur, { key: key(), sku: `${baseSku || 'SKU'}-${cur.length + 1}`, size: 'U', color: cur[0]?.color ?? 'Blanco', colorHex: cur[0]?.colorHex ?? '#ffffff', priceCents: cur[0]?.priceCents ?? 0, compareAtCents: null, reorderPoint: 4, active: true, initialStock: 0 }])}
        >
          + {t('products.addVariant')}
        </Button>
      </Card>

      {error && (
        <p role="alert" className="t-caption rounded-[10px] bg-red-soft p-3 text-red">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" loading={pending}>
          {t('common.save')}
        </Button>
        {initial?.id && v.status !== 'ARCHIVED' && (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="text-red"
            onClick={async () => {
              if (!confirm(t('products.archive') + '?')) return;
              const res = await archiveProduct(initial.id!);
              if (res.ok) {
                toast(t('products.deleted'));
                router.push('/admin/products');
              }
            }}
          >
            {t('products.archive')}
          </Button>
        )}
      </div>
    </form>
  );
}
