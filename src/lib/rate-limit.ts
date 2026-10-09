import 'server-only';
import { headers } from 'next/headers';

/**
 * Fixed-window in-memory rate limiter. Good enough for a single Railway
 * instance; swap the Map for Redis/Upstash when scaling horizontally.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  return { ok: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}

/** Throws a typed error the caller maps to a friendly message. */
export async function enforceRateLimit(scope: string, limit: number, windowMs: number) {
  const ip = await clientIp();
  const r = rateLimit(`${scope}:${ip}`, limit, windowMs);
  if (!r.ok) throw new RateLimitError();
}

export class RateLimitError extends Error {
  constructor() {
    super('RATE_LIMITED');
  }
}
