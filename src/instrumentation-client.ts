// Browser error monitoring, enabled only with NEXT_PUBLIC_SENTRY_DSN.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  import('@sentry/nextjs').then((Sentry) =>
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.05,
      replaysSessionSampleRate: 0,
    }),
  );
}
