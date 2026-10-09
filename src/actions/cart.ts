'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { getCurrentUser } from '@/lib/session';
import { getOrCreateCart, findCart, getCartView, findPromo } from '@/lib/cart';
import { availability } from '@/lib/stock';
import { enforceRateLimit } from '@/lib/rate-limit';
import { SIZED_GARMENTS, type GarmentType } from '@/config/catalog';
import { withSize } from '@/lib/students';

async function countOf(cartId: string) {
  const agg = await db.cartItem.aggregate({ where: { cartId, savedForLater: false }, _sum: { qty: true } });
  return agg._sum.qty ?? 0;
}

async function assertStudent(studentId: string | null | undefined) {
  if (!studentId) return null;
  const user = await getCurrentUser();
  if (!user) throw new ActionError('UNAUTHENTICATED');
  const s = await db.student.findFirst({ where: { id: studentId, parentId: user.id } });
  if (!s) throw new ActionError('FORBIDDEN');
  return s;
}

/** Remember the size per garment on the student profile (powers pre-selection). */
async function rememberSize(studentId: string, garmentType: string | null, size: string) {
  if (!garmentType || !SIZED_GARMENTS.includes(garmentType as GarmentType)) return;
  const s = await db.student.findUnique({ where: { id: studentId }, select: { sizes: true } });
  await db.student.update({ where: { id: studentId }, data: { sizes: withSize(s?.sizes, garmentType, size) } });
}

const addSchema = z.object({
  variantId: z.string().min(1),
  qty: z.number().int().min(1).max(20).default(1),
  studentId: z.string().nullish(),
});

export async function addToCart(input: z.input<typeof addSchema>) {
  return run(async () => {
    await enforceRateLimit('cart', 60, 60_000);
    const { variantId, qty, studentId } = addSchema.parse(input);
    const variant = await db.variant.findUnique({ where: { id: variantId }, include: { product: true } });
    if (!variant || !variant.active || variant.product.status !== 'ACTIVE') throw new ActionError('NOT_FOUND');
    await assertStudent(studentId);
    const cart = await getOrCreateCart();
    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, variantId, studentId: studentId ?? null, bundleGroup: null, savedForLater: false },
    });
    const want = (existing?.qty ?? 0) + qty;
    const avail = (await availability([variantId], cart.id))[variantId] ?? 0;
    if (want > avail && !variant.product.allowPreorder) throw new ActionError('OUT_OF_STOCK');
    if (existing) await db.cartItem.update({ where: { id: existing.id }, data: { qty: want } });
    else await db.cartItem.create({ data: { cartId: cart.id, variantId, qty, studentId: studentId ?? null } });
    if (studentId) await rememberSize(studentId, variant.product.garmentType, variant.size);
    await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    return { count: await countOf(cart.id), preorder: want > avail };
  });
}

const bundleSchema = z.object({
  bundleId: z.string().min(1),
  studentId: z.string().nullish(),
  lines: z.array(z.object({ productId: z.string(), variantId: z.string() })).min(1),
});

export async function addBundleToCart(input: z.input<typeof bundleSchema>) {
  return run(async () => {
    await enforceRateLimit('cart', 60, 60_000);
    const { bundleId, studentId, lines } = bundleSchema.parse(input);
    const bundle = await db.bundle.findFirst({ where: { id: bundleId, status: 'ACTIVE' }, include: { items: true } });
    if (!bundle) throw new ActionError('NOT_FOUND');
    await assertStudent(studentId);
    for (const req of bundle.items.filter((i) => !i.optional)) {
      if (!lines.some((l) => l.productId === req.productId)) throw new ActionError('MISSING_SIZES');
    }
    const variants = await db.variant.findMany({
      where: { id: { in: lines.map((l) => l.variantId) }, active: true },
      include: { product: true },
    });
    const cart = await getOrCreateCart();
    const avail = await availability(
      variants.map((v) => v.id),
      cart.id,
    );
    const group = randomUUID();
    const creates = lines.map((l) => {
      const item = bundle.items.find((i) => i.productId === l.productId);
      const v = variants.find((x) => x.id === l.variantId && x.productId === l.productId);
      if (!item || !v) throw new ActionError('INVALID');
      if ((avail[v.id] ?? 0) < item.qty && !v.product.allowPreorder) throw new ActionError('OUT_OF_STOCK');
      return { cartId: cart.id, variantId: v.id, qty: item.qty, studentId: studentId ?? null, bundleId, bundleGroup: group };
    });
    await db.cartItem.createMany({ data: creates });
    if (studentId) for (const v of variants) await rememberSize(studentId, v.product.garmentType, v.size);
    return { count: await countOf(cart.id) };
  });
}

/** Every mutation below verifies the line belongs to the visitor's cart. */
async function ownLine(itemId: string) {
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) throw new ActionError('NOT_FOUND');
  return { cart, item };
}

export async function updateCartQty(itemId: string, qty: number) {
  return run(async () => {
    const q = z.number().int().min(1).max(20).parse(qty);
    const { cart, item } = await ownLine(itemId);
    const avail = (await availability([item.variantId], cart.id))[item.variantId] ?? 0;
    if (q > avail && !item.variant.product.allowPreorder) throw new ActionError('OUT_OF_STOCK');
    await db.cartItem.update({ where: { id: itemId }, data: { qty: q } });
    return { count: await countOf(cart.id) };
  });
}

export async function removeCartItem(itemId: string) {
  return run(async () => {
    const { cart, item } = await ownLine(itemId);
    await db.cartItem.delete({ where: { id: itemId } });
    return {
      count: await countOf(cart.id),
      restore: { variantId: item.variantId, qty: item.qty, studentId: item.studentId, bundleId: item.bundleId, bundleGroup: item.bundleGroup, savedForLater: item.savedForLater },
    };
  });
}

const restoreSchema = z.object({
  variantId: z.string(),
  qty: z.number().int().min(1).max(20),
  studentId: z.string().nullable(),
  bundleId: z.string().nullable(),
  bundleGroup: z.string().nullable(),
  savedForLater: z.boolean(),
});

/** Undo for swipe-to-remove. */
export async function restoreCartItem(input: z.input<typeof restoreSchema>) {
  return run(async () => {
    const data = restoreSchema.parse(input);
    await assertStudent(data.studentId);
    const cart = await getOrCreateCart();
    await db.cartItem.create({ data: { ...data, cartId: cart.id } });
    return { count: await countOf(cart.id) };
  });
}

export async function toggleSaveForLater(itemId: string) {
  return run(async () => {
    const { cart, item } = await ownLine(itemId);
    // Saving a bundle piece for later breaks the kit; detach it from the group.
    await db.cartItem.update({
      where: { id: itemId },
      data: { savedForLater: !item.savedForLater, ...(item.savedForLater ? {} : { bundleGroup: null, bundleId: null }) },
    });
    return { count: await countOf(cart.id) };
  });
}

export async function assignCartStudent(itemId: string, studentId: string | null) {
  return run(async () => {
    const { item } = await ownLine(itemId);
    const s = await assertStudent(studentId);
    await db.cartItem.update({ where: { id: itemId }, data: { studentId: s?.id ?? null } });
    if (s) await rememberSize(s.id, item.variant.product.garmentType, item.variant.size);
    return null;
  });
}

export async function applyPromo(code: string) {
  return run(async () => {
    await enforceRateLimit('promo', 15, 60_000);
    const clean = z.string().trim().min(2).max(40).parse(code).toUpperCase();
    const promo = await findPromo(clean);
    if (!promo) throw new ActionError('PROMO_INVALID');
    const cart = await getOrCreateCart();
    await db.cart.update({ where: { id: cart.id }, data: { promoCode: promo.code } });
    return { code: promo.code };
  });
}

export async function removePromo() {
  return run(async () => {
    const cart = await findCart();
    if (cart) await db.cart.update({ where: { id: cart.id }, data: { promoCode: null } });
    return null;
  });
}

/** Desktop bag drawer fetches the full view on open. */
export async function getBag(locale: string) {
  return run(() => getCartView(locale === 'en' ? 'en' : 'es'));
}
