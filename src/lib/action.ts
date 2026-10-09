import 'server-only';
import { ZodError } from 'zod';
import { AuthError } from '@/lib/session';
import { RateLimitError } from '@/lib/rate-limit';

/**
 * Uniform server-action result. Errors are short codes the client maps to
 * translated copy; internals never leak to the browser.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

export class ActionError extends Error {
  constructor(
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(code);
  }
}

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.code, fields: e.fields };
    if (e instanceof AuthError) return { ok: false, error: e.code };
    if (e instanceof RateLimitError) return { ok: false, error: 'RATE_LIMITED' };
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of e.issues) fields[issue.path.join('.')] = issue.message;
      return { ok: false, error: 'INVALID', fields };
    }
    // Let Next.js control-flow errors (redirect/notFound) propagate.
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e;
    console.error('[action]', e);
    return { ok: false, error: 'UNKNOWN' };
  }
}
