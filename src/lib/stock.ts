import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type Tx = Prisma.TransactionClient | typeof db;

/**
 * Units sellable right now = stock − active holds by *other* carts.
 * (A family's own hold never blocks their own checkout.)
 */
export async function availability(variantIds: string[], excludeCartId?: string | null, tx: Tx = db) {
  if (!variantIds.length) return {} as Record<string, number>;
  const [variants, holds] = await Promise.all([
    tx.variant.findMany({ where: { id: { in: variantIds } }, select: { id: true, stock: true } }),
    tx.stockHold.groupBy({
      by: ['variantId'],
      where: {
        variantId: { in: variantIds },
        expiresAt: { gt: new Date() },
        ...(excludeCartId ? { cartId: { not: excludeCartId } } : {}),
      },
      _sum: { qty: true },
    }),
  ]);
  const held = Object.fromEntries(holds.map((h) => [h.variantId, h._sum.qty ?? 0]));
  return Object.fromEntries(variants.map((v) => [v.id, Math.max(0, v.stock - (held[v.id] ?? 0))])) as Record<string, number>;
}

/** Remove expired holds (called opportunistically and by the cron route). */
export async function purgeExpiredHolds(tx: Tx = db) {
  await tx.stockHold.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
