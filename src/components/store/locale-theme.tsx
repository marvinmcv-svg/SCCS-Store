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

const headerBtn = 'pressable grid size-11 place-items-center rounded-full text-ink hover:bg-bg-subtle';

/** Compact sun/moon toggle for the top bars (flips the resolved theme). */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('common');
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? t('switchToLight') : t('switchToDark')}
      title={dark ? t('switchToLight') : t('switchToDark')}
      className={cn(headerBtn, className)}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
    </button>
  );
}

/** Compact ES/EN pill for the top bars: shows the language you switch to. */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === 'es' ? 'en' : 'es';
  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: next, scroll: false })}
      aria-label={t('switchLanguage')}
      title={t('switchLanguage')}
      lang={next}
      className={cn('pressable flex h-11 items-center rounded-full px-2 hover:bg-bg-subtle', className)}
    >
      <span className="flex items-center rounded-full bg-bg-subtle p-0.5 font-mono text-[11px] font-semibold tracking-wide">
        {(['es', 'en'] as const).map((l) => (
          <span key={l} className={cn('rounded-full px-2 py-1 uppercase transition-colors', l === locale ? 'bg-bg text-ink shadow-1' : 'text-ink-2')}>
            {l}
          </span>
        ))}
      </span>
    </button>
  );
}
