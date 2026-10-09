import type { Instrumentation } from 'next';

/**
 * Server-side error monitoring. Sentry loads only when SENTRY_DSN is set,
 * so local/dev and unconfigured deploys pay nothing.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Sentry's default data collection excludes user PII; keep it that way
    // (minors' info lives in this app). Don't enable dataCollection.user.
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
