'use server';

import { z } from 'zod';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { requireRole } from '@/lib/session';
import { audit } from '@/lib/audit';
import { revalidateCatalog } from '@/lib/revalidate';
import { notifyOrder } from '@/lib/notify';

const schema = z.object({
  id: z.string(),
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
  resolution: z.string().trim().max(300).optional(),
  restock: z.boolean().default(false),
});

const LABEL: Record<string, { es: string; en: string }> = {
  APPROVED: { es: 'aprobada: traiga la prenda al colegio', en: 'approved: bring the item to school' },
  REJECTED: { es: 'rechazada', en: 'rejected' },
  COMPLETED: { es: 'realizada', en: 'completed' },
};

/**
 * Resolve an exchange. On COMPLETED with `restock`, the returned item goes
 * back to stock and, if a new size was requested and exists, one unit of it
 * is taken out — both logged as stock movements.
 */
export async function resolveExchange(input: z.input<typeof schema>) {
  return run(async () => {
    const user = await requireRole('STAFF');
    const d = schema.parse(input);
    const ex = await db.exchangeRequest.findUnique({ where: { id: d.id }, include: { orderItem: { include: { order: true } } } });
    if (!ex) throw new ActionError('NOT_FOUND');
    const allowed: Record<string, string[]> = { REQUESTED: ['APPROVED', 'REJECTED', 'COMPLETED'], APPROVED: ['COMPLETED', 'REJECTED'] };
    if (!allowed[ex.status]?.includes(d.status)) throw new ActionError('INVALID_STATUS');

    await db.$transaction(async (tx) => {
      await tx.exchangeRequest.update({ where: { id: ex.id }, data: { status: d.status, resolution: d.resolution || null, resolvedById: user.id, resolvedAt: new Date() } });
      if (d.status === 'COMPLETED' && d.restock && ex.orderItem.variantId) {
        const back = await tx.variant.update({ where: { id: ex.orderItem.variantId }, data: { stock: { increment: 1 } } });
        await tx.stockMovement.create({ data: { variantId: back.id, delta: 1, stockAfter: back.stock, reason: 'RETURN', orderId: ex.orderItem.orderId, actorId: user.id, note: `exchange ${ex.id}` } });
        if (ex.desiredSize) {
          const out = await tx.variant.findFirst({ where: { productId: ex.orderItem.productId, size: ex.desiredSize, active: true } });
          if (out && out.stock > 0) {
            const v = await tx.variant.update({ where: { id: out.id }, data: { stock: { decrement: 1 } } });
            await tx.stockMovement.create({ data: { variantId: v.id, delta: -1, stockAfter: v.stock, reason: 'EXCHANGE', orderId: ex.orderItem.orderId, actorId: user.id, note: `exchange ${ex.id}` } });
          }
        }
      }
      await tx.orderEvent.create({ data: { orderId: ex.orderItem.orderId, type: 'note', note: `exchange ${d.status.toLowerCase()} · ${ex.orderItem.productName}`, actorId: user.id } });
    });
    await audit(user.id, `exchange.${d.status.toLowerCase()}`, 'ExchangeRequest', ex.id, { restock: d.restock });
    const locale = ex.orderItem.order.locale === 'en' ? 'en' : 'es';
    after(() => notifyOrder(ex.orderItem.orderId, 'exchange_update', { status: LABEL[d.status][locale], reason: d.resolution }));
    if (d.restock) revalidateCatalog();
    revalidatePath('/[locale]/admin/exchanges', 'page');
    return null;
  });
}
