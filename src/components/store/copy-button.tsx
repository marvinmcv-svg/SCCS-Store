'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { haptic } from '@/lib/haptics';

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations('common');
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          haptic();
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="pressable t-label shrink-0 rounded-full px-2.5 py-1.5 text-ink-2 ring-1 ring-line-strong ring-inset hover:text-ink"
      aria-label={`${t('copy')} ${value}`}
    >
      {done ? t('copied') : t('copy')}
    </button>
  );
}
