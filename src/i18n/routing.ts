import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Spanish lives at "/", English at "/en".
  localePrefix: 'as-needed',
  // Spanish is the default for everyone; English is an explicit choice
  // (remembered in the NEXT_LOCALE cookie by the language switcher).
  localeDetection: false,
});
