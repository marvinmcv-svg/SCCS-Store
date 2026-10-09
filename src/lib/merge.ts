import 'server-only';
import { db } from '@/lib/db';

/**
 * When an anonymous visitor signs in, move their guest bag and favorites
 * into their account so nothing is lost.
 */
export async function mergeGuestData(userId: string, cartToken: string | null | undefined) {
  if (!cartToken) return;
  await db.$transaction(async (tx) => {
    const guest = await tx.cart.findUnique({ where: { token: cartToken }, include: { items: true } });
    if (guest && guest.userId !== userId) {
      const mine = await tx.cart.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' } });
      if (!mine) {
        await tx.cart.update({ where: { id: guest.id }, data: { userId } });
      } else if (guest.userId === null) {
        for (const it of guest.items) {
          const same = await tx.cartItem.findFirst({
            where: { cartId: mine.id, variantId: it.variantId, studentId: it.studentId, bundleGroup: it.bundleGroup, savedForLater: it.savedForLater },
          });
          if (same) await tx.cartItem.update({ where: { id: same.id }, data: { qty: same.qty + it.qty } });
          else await tx.cartItem.update({ where: { id: it.id }, data: { cartId: mine.id, studentId: null } });
        }
        await tx.cart.delete({ where: { id: guest.id } });
      }
    }
    const favs = await tx.favorite.findMany({ where: { ownerKey: `c:${cartToken}` } });
    for (const f of favs) {
      await tx.favorite.upsert({
        where: { ownerKey_productId: { ownerKey: `u:${userId}`, productId: f.productId } },
        update: {},
        create: { ownerKey: `u:${userId}`, productId: f.productId },
      });
    }
    await tx.favorite.deleteMany({ where: { ownerKey: `c:${cartToken}` } });
  });
}
