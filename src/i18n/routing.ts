import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  // Spanish lives at "/", English at "/en".
  localePrefix: 'as-needed',
});
