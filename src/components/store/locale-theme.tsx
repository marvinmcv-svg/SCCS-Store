'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useMounted } from '@/lib/use-mounted';
import { cn } from '@/lib/utils';

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'pressable h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors',
            value === o.value ? 'bg-bg text-ink shadow-1' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Segmented
      label={t('language')}
      value={locale}
      onChange={(l) => router.replace(pathname, { locale: l, scroll: false })}
      options={[
        { value: 'es', label: 'Español' },
        { value: 'en', label: 'English' },
      ]}
    />
  );
}

export function ThemeSwitcher() {
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  return (
    <Segmented
      label={t('theme')}
      value={mounted ? ((theme as 'light' | 'dark' | 'system') ?? 'system') : 'system'}
      onChange={setTheme}
      options={[
        { value: 'light', label: t('themeLight') },
        { value: 'dark', label: t('themeDark') },
        { value: 'system', label: t('themeSystem') },
      ]}
    />
  );
}
