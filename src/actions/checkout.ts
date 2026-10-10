'use server';

import { z } from 'zod';
import { after } from 'next/server';
import { run, ActionError } from '@/lib/action';
import { findCart } from '@/lib/cart';
import { getCurrentUser } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { holdCart, createOrderFromCart } from '@/lib/orders';
import { notifyOrder, notifyStoreNewOrder } from '@/lib/notify';

/** Called when the checkout page opens (and when the hold timer runs out). */
export async function startCheckout() {
  return run(async () => {
    const cart = await findCart();
    if (!cart || !cart.items.some((i) => !i.savedForLater)) throw new ActionError('EMPTY_CART');
    return holdCart(cart);
  });
}

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d]/g, '').replace(/^591/, ''))
  .refine((v) => /^[67]\d{7}$/.test(v), 'invalidPhone');

const schema = z.object({
  name: z.string().trim().min(2, 'required').max(80),
  email: z.string().trim().toLowerCase().email('invalidEmail'),
  phone,
  pickupSelf: z.boolean(),
  pickupName: z.string().trim().max(80).optional(),
  pickupPhone: z.string().trim().max(20).optional(),
  slotId: z.string().nullable(),
  paymentMethod: z.enum(['QR', 'TRANSFER', 'CASH', 'CARD']),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(16).max(64),
  locale: z.enum(['es', 'en']),
});

export async function placeOrder(input: z.input<typeof schema>) {
  return run(async () => {
    await enforceRateLimit('checkout', 10, 60_000);
    const d = schema.parse(input);
    if (!d.pickupSelf && (!d.pickupName || d.pickupName.length < 2)) throw new ActionError('INVALID', { pickupName: 'required' });
    let pickupPhone = d.phone;
    if (!d.pickupSelf) {
      const p = phone.safeParse(d.pickupPhone ?? '');
      if (!p.success) throw new ActionError('INVALID', { pickupPhone: 'invalidPhone' });
      pickupPhone = p.data;
    }
    const user = await getCurrentUser();
    const cart = await findCart();
    if (!cart) throw new ActionError('EMPTY_CART');
    const order = await createOrderFromCart(cart, user?.id ?? null, {
      name: d.name,
      email: d.email,
      phone: d.phone,
      pickupName: d.pickupSelf ? d.name : d.pickupName!,
      pickupPhone,
      slotId: d.slotId,
      paymentMethod: d.paymentMethod,
      notes: d.notes,
      idempotencyKey: d.idempotencyKey,
      locale: d.locale,
    });
    // Sent after the response (kept alive by after()); never blocks or fails the order.
    after(() => notifyOrder(order.id, 'order_received'));
    after(() => notifyStoreNewOrder(order.id));
    return { code: order.code, token: order.pickupToken };
  });
}
