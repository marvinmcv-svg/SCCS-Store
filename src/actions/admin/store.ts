'use server';

import { z } from 'zod';
import { revalidatePath, revalidateTag } from 'next/cache';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { requireRole } from '@/lib/session';
import { audit } from '@/lib/audit';
import { revalidateCatalog } from '@/lib/revalidate';
import { laPazDate } from '@/lib/dates';
import { processImageUpload } from '@/lib/images';
import { paymentSettingsSchema, storeSettingsSchema, SETTINGS_TAG } from '@/lib/settings';
import { sendEmail, emailLayout } from '@/lib/notify/email';
import { siteUrl } from '@/lib/notify';

const time = z.string().regex(/^\d{2}:\d{2}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ─── Pickup slots ───────────────────────────────────────────────────────────

const slotSchema = z.object({ date, start: time, end: time, capacity: z.number().int().min(1).max(500), note: z.string().max(120).optional() });

export async function createSlot(input: z.input<typeof slotSchema>) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const d = slotSchema.parse(input);
    if (d.end <= d.start) throw new ActionError('INVALID', { end: 'before start' });
    const s = await db.pickupSlot.create({ data: { startsAt: laPazDate(d.date, d.start), endsAt: laPazDate(d.date, d.end), capacity: d.capacity, note: d.note || null } });
    await audit(user.id, 'slot.create', 'PickupSlot', s.id, d);
    revalidatePath('/[locale]/admin/slots', 'page');
    return { count: 1 };
  });
}

const bulkSchema = z.object({ from: date, to: date, weekdays: z.array(z.number().int().min(0).max(6)).min(1), start: time, end: time, capacity: z.number().int().min(1).max(500) });

/** Create a recurring set of slots (e.g. every Tue/Thu 7:15–8:15 for a month). */
export async function createSlotsBulk(input: z.input<typeof bulkSchema>) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const d = bulkSchema.parse(input);
    if (d.end <= d.start || d.to < d.from) throw new ActionError('INVALID');
    const data: { startsAt: Date; endsAt: Date; capacity: number }[] = [];
    for (let cur = new Date(`${d.from}T12:00:00Z`); cur <= new Date(`${d.to}T12:00:00Z`); cur = new Date(cur.getTime() + 86_400_000)) {
      if (!d.weekdays.includes(cur.getUTCDay())) continue;
      const day = cur.toISOString().slice(0, 10);
      data.push({ startsAt: laPazDate(day, d.start), endsAt: laPazDate(day, d.end), capacity: d.capacity });
      if (data.length > 200) throw new ActionError('LIMIT');
    }
    await db.pickupSlot.createMany({ data });
    await audit(user.id, 'slot.bulk', 'PickupSlot', null, { ...d, count: data.length });
    revalidatePath('/[locale]/admin/slots', 'page');
    return { count: data.length };
  });
}

export async function updateSlot(id: string, patch: { capacity?: number; active?: boolean }) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const p = z.object({ capacity: z.number().int().min(0).max(500).optional(), active: z.boolean().optional() }).parse(patch);
    const slot = await db.pickupSlot.findUnique({ where: { id } });
    if (!slot) throw new ActionError('NOT_FOUND');
    if (p.capacity !== undefined && p.capacity < slot.booked) throw new ActionError('INVALID', { capacity: 'below booked' });
    await db.pickupSlot.update({ where: { id }, data: p });
    await audit(user.id, 'slot.update', 'PickupSlot', id, p);
    revalidatePath('/[locale]/admin/slots', 'page');
    return null;
  });
}

// ─── Content ────────────────────────────────────────────────────────────────

const bannerSchema = z.object({
  id: z.string(),
  eyebrowEs: z.string().max(80),
  eyebrowEn: z.string().max(80),
  titleEs: z.string().min(1).max(120),
  titleEn: z.string().min(1).max(120),
  subtitleEs: z.string().max(200),
  subtitleEn: z.string().max(200),
  ctaLabelEs: z.string().max(40),
  ctaLabelEn: z.string().max(40),
  href: z.string().startsWith('/').max(200),
  active: z.boolean(),
});

export async function saveBanner(input: z.input<typeof bannerSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const { id, ...d } = bannerSchema.parse(input);
    await db.banner.update({ where: { id }, data: d });
    await audit(user.id, 'banner.update', 'Banner', id);
    revalidateCatalog();
    return null;
  });
}

export async function uploadBannerImage(id: string, field: 'imageMobile' | 'imageDesktop', formData: FormData) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const file = formData.get('file');
    if (!(file instanceof File)) throw new ActionError('INVALID');
    const img = await processImageUpload(file, 'banners').catch((e: Error) => {
      throw new ActionError(['FILE_SIZE', 'FILE_TYPE'].includes(e.message) ? e.message : 'UNKNOWN');
    });
    await db.banner.update({ where: { id }, data: { [field]: img.url, ...(field === 'imageMobile' ? { imageBlur: img.blur } : {}) } });
    await audit(user.id, 'banner.image', 'Banner', id, { field });
    revalidateCatalog();
    return { url: img.url };
  });
}

export async function saveCollection(id: string, productIds: string[], titleEs: string, titleEn: string) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    z.array(z.string()).max(30).parse(productIds);
    await db.$transaction([
      db.collection.update({ where: { id }, data: { titleEs: titleEs.slice(0, 80), titleEn: titleEn.slice(0, 80) } }),
      db.collectionItem.deleteMany({ where: { collectionId: id } }),
      db.collectionItem.createMany({ data: productIds.map((productId, sort) => ({ collectionId: id, productId, sort })) }),
    ]);
    await audit(user.id, 'collection.update', 'Collection', id, { count: productIds.length });
    revalidateCatalog();
    return null;
  });
}

const annSchema = z.object({ id: z.string().optional(), textEs: z.string().min(1).max(160), textEn: z.string().min(1).max(160), href: z.string().max(200).optional(), active: z.boolean() });

export async function saveAnnouncement(input: z.input<typeof annSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const { id, ...d } = annSchema.parse(input);
    const data = { ...d, href: d.href || null };
    const a = id ? await db.announcement.update({ where: { id }, data }) : await db.announcement.create({ data });
    await audit(user.id, 'announcement.save', 'Announcement', a.id);
    revalidateCatalog();
    return null;
  });
}

const promoSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  pct: z.number().int().min(1).max(100).nullable(),
  amountCents: z.number().int().min(1).nullable(),
  maxUses: z.number().int().min(1).nullable(),
  expiresAt: z.string().nullable(),
  active: z.boolean(),
});

export async function savePromo(input: z.input<typeof promoSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const { id, ...d } = promoSchema.parse(input);
    if (!d.pct && !d.amountCents) throw new ActionError('INVALID', { pct: 'required' });
    const data = { ...d, expiresAt: d.expiresAt ? new Date(`${d.expiresAt}T23:59:59-04:00`) : null };
    const p = id ? await db.promoCode.update({ where: { id }, data }) : await db.promoCode.create({ data });
    await audit(user.id, 'promo.save', 'PromoCode', p.id, { code: p.code });
    revalidatePath('/[locale]/admin/content', 'page');
    return null;
  });
}

// ─── Users & roles (OWNER) ──────────────────────────────────────────────────

export async function setUserRole(userId: string, role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'OWNER') {
  return run(async () => {
    const me = await requireRole('OWNER');
    if (me.id === userId) throw new ActionError('FORBIDDEN');
    const r = z.enum(['CUSTOMER', 'STAFF', 'ADMIN', 'OWNER']).parse(role);
    const before = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    await db.user.update({ where: { id: userId }, data: { role: r } });
    await audit(me.id, 'user.role', 'User', userId, { from: before?.role, to: r });
    revalidatePath('/[locale]/admin/users', 'page');
    return null;
  });
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  return run(async () => {
    const me = await requireRole('OWNER');
    if (me.id === userId) throw new ActionError('FORBIDDEN');
    await db.user.update({ where: { id: userId }, data: { disabled } });
    await audit(me.id, disabled ? 'user.disable' : 'user.enable', 'User', userId);
    revalidatePath('/[locale]/admin/users', 'page');
    return null;
  });
}

const inviteSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), role: z.enum(['STAFF', 'ADMIN', 'OWNER']) });

/** Create a staff account and email a temporary password + login link. */
export async function inviteStaff(input: z.input<typeof inviteSchema>) {
  return run(async () => {
    const me = await requireRole('OWNER');
    const d = inviteSchema.parse(input);
    const temp = randomBytes(9).toString('base64url');
    const existing = await db.user.findUnique({ where: { email: d.email } });
    const user = existing
      ? await db.user.update({ where: { id: existing.id }, data: { role: d.role } })
      : await db.user.create({ data: { email: d.email, name: d.name, role: d.role, passwordHash: await bcrypt.hash(temp, 11) } });
    await sendEmail({
      to: d.email,
      subject: 'Acceso al portal de SCCS Store',
      text: `Hola ${d.name}, tiene acceso al portal de administración de SCCS Store. Entre en ${siteUrl()}/login${existing ? '' : ` con su correo y la contraseña temporal: ${temp}`}`,
      html: emailLayout({
        title: 'Acceso al portal de administración',
        body: `Hola ${d.name}, ahora tiene acceso como <b>${d.role}</b>.${existing ? '' : `<br/>Contraseña temporal: <b style="font-family:monospace">${temp}</b><br/>Cámbiela después de entrar (o use "Entrar sin contraseña").`}`,
        cta: { label: 'Entrar', url: `${siteUrl()}/login?callbackUrl=/admin` },
      }),
    });
    await audit(me.id, 'user.invite', 'User', user.id, { role: d.role });
    revalidatePath('/[locale]/admin/users', 'page');
    return null;
  });
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function savePaymentSettings(input: z.input<typeof paymentSettingsSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const d = paymentSettingsSchema.parse(input);
    await db.setting.upsert({ where: { key: 'payments' }, update: { value: d }, create: { key: 'payments', value: d } });
    await audit(user.id, 'settings.payments', 'Setting', 'payments', { ...d });
    revalidateTag(SETTINGS_TAG, { expire: 0 });
    return null;
  });
}

export async function saveStoreSettings(input: z.input<typeof storeSettingsSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const d = storeSettingsSchema.parse(input);
    await db.setting.upsert({ where: { key: 'store' }, update: { value: d }, create: { key: 'store', value: d } });
    await audit(user.id, 'settings.store', 'Setting', 'store', d);
    revalidateTag(SETTINGS_TAG, { expire: 0 });
    return null;
  });
}

export async function uploadQrImage(formData: FormData) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const file = formData.get('file');
    if (!(file instanceof File)) throw new ActionError('INVALID');
    const img = await processImageUpload(file, 'payments').catch((e: Error) => {
      throw new ActionError(['FILE_SIZE', 'FILE_TYPE'].includes(e.message) ? e.message : 'UNKNOWN');
    });
    await audit(user.id, 'settings.qr', 'Setting', 'payments');
    return { url: img.url };
  });
}
