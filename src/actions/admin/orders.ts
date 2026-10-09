'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { OrderStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { requireRole } from '@/lib/session';
import { audit } from '@/lib/audit';
import { transitionOrder, templateFor } from '@/lib/orders';
import { notifyOrder } from '@/lib/notify';

const STATUSES = ['RECEIVED', 'PAYMENT_VERIFIED', 'PREPARING', 'READY', 'PICKED_UP', 'CANCELLED', 'EXPIRED'] as const;

function refresh(orderId?: string) {
  revalidatePath('/[locale]/admin', 'layout');
  if (orderId) revalidatePath(`/[locale]/admin/orders/${orderId}`, 'page');
}

/** Approve a receipt → payment verified → order moves to PAYMENT_VERIFIED. */
export async function verifyPayment(orderId: string, proofId?: string) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError('NOT_FOUND');
    if (['CANCELLED', 'EXPIRED'].includes(order.status)) throw new ActionError('INVALID_STATUS');
    await db.$transaction(async (tx) => {
      if (proofId) await tx.paymentProof.update({ where: { id: proofId }, data: { status: 'APPROVED', reviewedById: user.id, reviewedAt: new Date() } });
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'VERIFIED' } });
      await tx.orderEvent.create({ data: { orderId, type: 'payment', note: 'payment verified', actorId: user.id } });
    });
    if (order.status === 'RECEIVED') await transitionOrder(orderId, 'PAYMENT_VERIFIED', user.id);
    await audit(user.id, 'payment.verify', 'Order', orderId, { proofId: proofId ?? null, code: order.code });
    void notifyOrder(orderId, 'payment_verified');
    refresh(orderId);
    return null;
  });
}

export async function rejectPayment(orderId: string, proofId: string, reason: string) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const r = z.string().trim().min(3).max(200).parse(reason);
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError('NOT_FOUND');
    await db.$transaction([
      db.paymentProof.update({ where: { id: proofId }, data: { status: 'REJECTED', reviewedById: user.id, reviewedAt: new Date(), note: r } }),
      db.order.update({ where: { id: orderId }, data: { paymentStatus: 'REJECTED' } }),
      db.orderEvent.create({ data: { orderId, type: 'payment', note: `payment rejected · ${r}`, actorId: user.id } }),
    ]);
    await audit(user.id, 'payment.reject', 'Order', orderId, { proofId, reason: r, code: order.code });
    void notifyOrder(orderId, 'payment_rejected', { reason: r });
    refresh(orderId);
    return null;
  });
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const to = z.enum(STATUSES).parse(status);
    const before = await db.order.findUnique({ where: { id: orderId }, select: { status: true, code: true } });
    if (!before) throw new ActionError('NOT_FOUND');
    await transitionOrder(orderId, to, user.id, note);
    await audit(user.id, 'order.status', 'Order', orderId, { from: before.status, to, code: before.code, note: note ?? null });
    const tpl = templateFor(to);
    if (tpl) void notifyOrder(orderId, tpl, note ? { reason: note } : {});
    refresh(orderId);
    return null;
  });
}

export async function resendNotification(orderId: string) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError('NOT_FOUND');
    const tpl = templateFor(order.status) ?? 'order_received';
    await notifyOrder(orderId, tpl);
    await audit(user.id, 'notification.resend', 'Order', orderId, { template: tpl });
    refresh(orderId);
    return null;
  });
}

/** Look up an order by QR payload ("SCCS:<token>"), raw token, or human code. */
export async function findPickupOrder(input: string) {
  return run(async () => {
    await requireRole('STAFF');
    const raw = z.string().trim().min(3).max(120).parse(input);
    const token = raw.startsWith('SCCS:') ? raw.slice(5) : null;
    const code = raw.toUpperCase().startsWith('SC-') ? raw.toUpperCase() : `SC-${raw.toUpperCase()}`;
    const order = await db.order.findFirst({
      where: token ? { pickupToken: token } : { OR: [{ code }, { pickupToken: raw }] },
      include: { items: true, pickupSlot: true },
    });
    if (!order) throw new ActionError('NOT_FOUND');
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      totalCents: order.totalCents,
      name: order.name,
      pickupName: order.pickupName,
      pickupPhone: order.pickupPhone,
      pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
      items: order.items.map((i) => ({ id: i.id, name: i.productName, size: i.size, qty: i.qty, student: i.studentName, image: i.image })),
    };
  });
}

/** Hand over the order (cash orders are marked paid at the same time). */
export async function confirmPickup(orderId: string) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) throw new ActionError('NOT_FOUND');
    if (order.status !== 'READY') throw new ActionError('INVALID_STATUS');
    if (order.paymentMethod !== 'CASH' && order.paymentStatus !== 'VERIFIED') throw new ActionError('INVALID_STATUS');
    await transitionOrder(orderId, 'PICKED_UP', user.id, 'pickup via QR');
    await audit(user.id, 'order.pickup', 'Order', orderId, { code: order.code, cash: order.paymentMethod === 'CASH' });
    void notifyOrder(orderId, 'picked_up');
    refresh(orderId);
    return null;
  });
}
