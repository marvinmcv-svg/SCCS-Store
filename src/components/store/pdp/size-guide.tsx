'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { TOPS_CHART, recommendSize } from '@/config/sizing';
import { cn } from '@/lib/utils';

/** Size chart + sizing helper (height or age → recommended size). */
export function SizeGuide({
  open,
  onOpenChange,
  sizes,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sizes: string[];
  onPick?: (size: string) => void;
}) {
  const t = useTranslations('product');
  const [height, setHeight] = React.useState('');
  const [age, setAge] = React.useState('');
  const [result, setResult] = React.useState<string | null>(null);
  const rows = TOPS_CHART.filter((r) => sizes.includes(r.size));

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('sizeGuide')}>
      <section aria-labelledby="helper" className="rounded-[12px] bg-bg-subtle p-4">
        <h3 id="helper" className="t-title">
          {t('sizeHelperTitle')}
        </h3>
        <p className="t-caption mt-1 text-ink-2">{t('sizeHelperBody')}</p>
        <form
          className="mt-4 grid grid-cols-2 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setResult(recommendSize({ heightCm: Number(height) || undefined, age: Number(age) || undefined }, sizes));
          }}
        >
          <Field label={t('height')} htmlFor="sg-height">
            <Input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ''))} placeholder="128" className="bg-bg" />
          </Field>
          <Field label={t('age')} htmlFor="sg-age">
            <Input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))} placeholder="8" className="bg-bg" />
          </Field>
          <Button type="submit" variant="secondary" className="col-span-2" disabled={!height && !age}>
            {t('recommend')}
          </Button>
        </form>
        {result && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[10px] bg-bg p-3 animate-fade-up" aria-live="polite">
            <p className="t-body font-medium">{t('recommended', { size: result })}</p>
            {onPick && (
              <Button
                size="sm"
                onClick={() => {
                  onPick(result);
                  onOpenChange(false);
                }}
              >
                {t('useSize', { size: result })}
              </Button>
            )}
          </div>
        )}
      </section>
      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="t-caption w-full tabular">
            <thead>
              <tr className="text-left text-ink-2">
                <th className="py-2 pr-3 font-medium">{t('chartSize')}</th>
                <th className="py-2 pr-3 font-medium">{t('chartAge')}</th>
                <th className="py-2 pr-3 font-medium">{t('chartHeight')} (cm)</th>
                <th className="py-2 font-medium">{t('chartChest')} (cm)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.size} className={cn('border-t border-line', result === r.size && 'bg-accent-soft')}>
                  <td className="py-2.5 pr-3 font-medium">{r.size}</td>
                  <td className="py-2.5 pr-3">{r.age}</td>
                  <td className="py-2.5 pr-3">
                    {r.heightCm[0]}–{r.heightCm[1]}
                  </td>
                  <td className="py-2.5">
                    {r.chestCm[0]}–{r.chestCm[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BottomSheet>
  );
}
