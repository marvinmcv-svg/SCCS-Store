'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { getCurrentUser, requireUser } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { canViewOrder } from '@/lib/orders';
import { storage, sniffType, EXT, MAX_PROOF_BYTES } from '@/lib/storage';
import { getOrCreateCart } from '@/lib/cart';
import { availability } from '@/lib/stock';
import { getSettings } from '@/lib/settings';
import { addDays } from '@/lib/dates';

async function loadViewable(code: string, token: string | null | undefined) {
  const order = await db.order.findUnique({ where: { code } });
  const viewer = await getCurrentUser();
  if (!order || !canViewOrder(order, viewer, token)) throw new ActionError('NOT_FOUND');
  return { order, viewer };
}

/**
 * Payment receipt upload. Validates size and *real* type (magic bytes),
 * stores it privately and moves the payment to "submitted" for review.
 */
export async function submitProof(formData: FormData) {
  return run(async () => {
    await enforceRateLimit('proof', 10, 60_000);
    const code = z.string().min(4).max(20).parse(formData.get('code'));
    const token = (formData.get('token') as string | null) ?? null;
    const reference = z.string().trim().max(60).optional().parse((formData.get('reference') as string) || undefined);
    const file = formData.get('file');
    const { order } = await loadViewable(code, token);
    if (!['QR', 'TRANSFER'].includes(order.paymentMethod)) throw new ActionError('INVALID');
    if (order.paymentStatus === 'VERIFIED' || ['CANCELLED', 'EXPIRED'].includes(order.status)) throw new ActionError('INVALID_STATUS');

    let fileKey: string | null = null;
    let fileType: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PROOF_BYTES) throw new ActionError('FILE_SIZE');
      const buf = Buffer.from(await file.arrayBuffer());
      const type = sniffType(buf);
      if (!type) throw new ActionError('FILE_TYPE');
      fileKey = `private/proofs/${order.id}/${randomUUID()}.${EXT[type]}`;
      fileType = type;
      await storage().put(fileKey, buf, type);
    }
    if (!fileKey && !reference) throw new ActionError('INVALID');

    await db.$transaction([
      db.paymentProof.create({ data: { orderId: order.id, fileKey, fileType, reference: reference ?? null } }),
      db.order.update({ where: { id: order.id }, data: { paymentStatus: 'SUBMITTED' } }),
      db.orderEvent.create({ data: { orderId: order.id, type: 'payment', note: reference ? `proof submitted · ${reference}` : 'proof submitted' } }),
    ]);
    revalidatePath('/[locale]/orders/[code]', 'page');
    return null;
  });
}

const lookupSchema = z.object({ code: z.string().trim().toUpperCase().min(4).max(20), email: z.string().trim().toLowerCase().email() });

/** Guest order lookup by code + email. */
export async function lookupOrder(input: z.input<typeof lookupSchema>) {
  return run(async () => {
    await enforceRateLimit('lookup', 10, 60_000);
    const d = lookupSchema.parse(input);
    const code = d.code.startsWith('SC-') ? d.code : `SC-${d.code}`;
    const order = await db.order.findUnique({ where: { code } });
    if (!order || order.email !== d.email) throw new ActionError('NOT_FOUND');
    return { code: order.code, token: order.pickupToken };
  });
}

/** Reorder in one tap: adds still-available items (same sizes, same students). */
export async function reorder(code: string) {
  return run(async () => {
    const user = await requireUser();
    const order = await db.order.findUnique({ where: { code }, include: { items: true } });
    if (!order || order.userId !== user.id) throw new ActionError('NOT_FOUND');
    const cart = await getOrCreateCart();
    const ids = order.items.map((i) => i.variantId).filter(Boolean) as string[];
    const avail = await availability(ids, cart.id);
    const variants = await db.variant.findMany({ where: { id: { in: ids }, active: true, product: { status: 'ACTIVE' } }, include: { product: true } });
    const students = new Set((await db.student.findMany({ where: { parentId: user.id }, select: { id: true } })).map((s) => s.id));
    let added = 0;
    for (const it of order.items) {
      const v = variants.find((x) => x.id === it.variantId);
      if (!v) continue;
      const qty = v.product.allowPreorder ? it.qty : Math.min(it.qty, avail[v.id] ?? 0);
      if (qty <= 0) continue;
      await db.cartItem.create({ data: { cartId: cart.id, variantId: v.id, qty, studentId: it.studentId && students.has(it.studentId) ? it.studentId : null } });
      added += qty;
    }
    const agg = await db.cartItem.aggregate({ where: { cartId: cart.id, savedForLater: false }, _sum: { qty: true } });
    return { added, count: agg._sum.qty ?? 0 };
  });
}

const exchangeSchema = z.object({
  code: z.string(),
  token: z.string().nullish(),
  orderItemId: z.string(),
  reason: z.enum(['SIZE', 'DEFECT', 'OTHER']),
  desiredSize: z.string().max(10).optional(),
  note: z.string().trim().max(500).optional(),
});

/** Exchange request within the policy window after pickup. */
export async function requestExchange(input: z.input<typeof exchangeSchema>) {
  return run(async () => {
    await enforceRateLimit('exchange', 10, 60_000);
    const d = exchangeSchema.parse(input);
    const { order } = await loadViewable(d.code, d.token);
    const settings = await getSettings();
    if (order.status !== 'PICKED_UP' || !order.pickedUpAt) throw new ActionError('INVALID_STATUS');
    if (addDays(order.pickedUpAt, settings.store.exchangeDays) < new Date()) throw new ActionError('WINDOW_CLOSED');
    const item = await db.orderItem.findFirst({ where: { id: d.orderItemId, orderId: order.id }, include: { exchanges: true } });
    if (!item) throw new ActionError('NOT_FOUND');
    if (item.exchanges.some((e) => e.status === 'REQUESTED' || e.status === 'APPROVED')) throw new ActionError('LIMIT');
    await db.exchangeRequest.create({ data: { orderItemId: item.id, reason: d.reason, desiredSize: d.desiredSize || null, note: d.note || null } });
    await db.orderEvent.create({ data: { orderId: order.id, type: 'note', note: `exchange requested · ${item.productName} ${item.size}${d.desiredSize ? ` → ${d.desiredSize}` : ''}` } });
    revalidatePath('/[locale]/orders/[code]', 'page');
    return null;
  });
}
