'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthError as NextAuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { enforceRateLimit } from '@/lib/rate-limit';
import { rotateCartToken } from '@/lib/cart-token';
import { audit } from '@/lib/audit';

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d]/g, '').replace(/^591/, ''))
  .refine((v) => /^[67]\d{7}$/.test(v), 'invalidPhone');

/** Only allow same-site relative redirects (no open redirect). */
function safeRedirect(url: string | undefined | null) {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/profile';
  return url;
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'required').max(80),
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  phone,
  password: z.string().min(8, 'passwordShort').max(128),
  locale: z.enum(['es', 'en']).default('es'),
  callbackUrl: z.string().optional(),
});

export async function registerAction(input: z.input<typeof registerSchema>) {
  return run(async () => {
    await enforceRateLimit('register', 5, 60_000);
    const d = registerSchema.parse(input);
    // Never let a registration claim an existing email (that would be an
    // account takeover). Existing magic-link users simply sign in by link.
    const exists = await db.user.findUnique({ where: { email: d.email } });
    if (exists) throw new ActionError('EMAIL_TAKEN', { email: 'emailTaken' });
    const passwordHash = await bcrypt.hash(d.password, 11);
    const user = await db.user.create({ data: { email: d.email, name: d.name, phone: d.phone, passwordHash, locale: d.locale } });
    // Guest orders with this email are linked only after the email is
    // verified via magic link (see auth.ts events.signIn).
    await audit(user.id, 'user.register', 'User', user.id);
    await signIn('credentials', { email: d.email, password: d.password, redirect: false });
    return { redirectTo: safeRedirect(d.callbackUrl) };
  });
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  password: z.string().min(1, 'required'),
  callbackUrl: z.string().optional(),
});

export async function passwordLoginAction(input: z.input<typeof loginSchema>) {
  return run(async () => {
    await enforceRateLimit('login', 10, 60_000);
    const d = loginSchema.parse(input);
    try {
      await signIn('credentials', { email: d.email, password: d.password, redirect: false });
    } catch (e) {
      if (e instanceof NextAuthError) throw new ActionError('INVALID_CREDENTIALS');
      throw e;
    }
    const user = await db.user.findUnique({ where: { email: d.email }, select: { role: true } });
    const fallback = user && user.role !== 'CUSTOMER' ? '/admin' : '/profile';
    return { redirectTo: d.callbackUrl ? safeRedirect(d.callbackUrl) : fallback };
  });
}

const magicSchema = z.object({ email: z.string().trim().toLowerCase().email('invalidEmail'), callbackUrl: z.string().optional() });

export async function magicLinkAction(input: z.input<typeof magicSchema>) {
  return run(async () => {
    await enforceRateLimit('magic', 5, 60_000);
    const d = magicSchema.parse(input);
    await signIn('email', { email: d.email, redirect: false, redirectTo: safeRedirect(d.callbackUrl) });
    return null;
  });
}

export async function signOutAction() {
  await rotateCartToken();
  await signOut({ redirectTo: '/' });
}
