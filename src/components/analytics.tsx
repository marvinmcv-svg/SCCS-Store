import Script from 'next/script';

/**
 * Privacy-respecting, cookieless analytics (Plausible-compatible).
 * Disabled unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set. Aggregate page views
 * only: no cookies, no personal data, nothing about students.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
