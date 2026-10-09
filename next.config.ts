import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  // Cache Components is intentionally off: next-intl and Auth.js read
  // request data on most routes. Catalog reads are cached with
  // unstable_cache + tags and revalidated on admin writes (see lib/catalog).
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/images/**' }, { pathname: '/api/files/**' }, { pathname: '/brand/**' }],
    remotePatterns: process.env.S3_PUBLIC_URL ? [new URL(`${process.env.S3_PUBLIC_URL.replace(/\/$/, '')}/**`)] : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
