'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { favoriteOwnerKey } from '@/lib/cart';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function toggleFavorite(productId: string) {
  return run(async () => {
    await enforceRateLimit('fav', 120, 60_000);
    const id = z.string().min(1).parse(productId);
    const ownerKey = await favoriteOwnerKey(true);
    if (!ownerKey) throw new ActionError('UNKNOWN');
    const product = await db.product.findUnique({ where: { id }, select: { id: true } });
    if (!product) throw new ActionError('NOT_FOUND');
    const existing = await db.favorite.findUnique({ where: { ownerKey_productId: { ownerKey, productId: id } } });
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await db.favorite.create({ data: { ownerKey, productId: id } });
    return { favorited: true };
  });
}

const alertSchema = z.object({ productId: z.string(), variantId: z.string().nullish(), email: z.string().email(), locale: z.enum(['es', 'en']) });

/** Back-in-stock alert; emailed when stock is replenished (lib/inventory.ts). */
export async function createStockAlert(input: z.input<typeof alertSchema>) {
  return run(async () => {
    await enforceRateLimit('alert', 10, 60_000);
    const d = alertSchema.parse(input);
    const email = d.email.toLowerCase();
    const existing = await db.stockAlert.findFirst({ where: { productId: d.productId, variantId: d.variantId ?? null, email } });
    if (existing) await db.stockAlert.update({ where: { id: existing.id }, data: { notifiedAt: null, locale: d.locale } });
    else await db.stockAlert.create({ data: { productId: d.productId, variantId: d.variantId ?? null, email, locale: d.locale } });
    return null;
  });
}
