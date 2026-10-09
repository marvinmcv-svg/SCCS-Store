import 'server-only';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Prisma, type OrderStatus, type PaymentMethod } from '@prisma/client';
import { db } from '@/lib/db';
import { ActionError } from '@/lib/action';
import { availability, purgeExpiredHolds } from '@/lib/stock';
import { bundleRules, findPromo, type CartWithItems } from '@/lib/cart';
import { priceCart } from '@/lib/pricing';
import { withSize } from '@/lib/students';
import { PROVIDERS } from '@/lib/payments';
import { getSettings } from '@/lib/settings';
import { addDays } from '@/lib/dates';
import { school } from '@/config/school';
import { SIZED_GARMENTS, type GarmentType } from '@/config/catalog';

type Tx = Prisma.TransactionClient;

// ─── Status machine ─────────────────────────────────────────────────────────

/**
 * Allowed transitions. Pay-at-school (CASH) orders can be prepared before
 * payment, because payment happens at pickup.
 */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PAYMENT_VERIFIED', 'PREPARING', 'CANCELLED', 'EXPIRED'],
  PAYMENT_VERIFIED: ['PREPARING', 'READY', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP', 'PREPARING', 'CANCELLED'],
  PICKED_UP: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const TRACK_STEPS: OrderStatus[] = ['RECEIVED', 'PAYMENT_VERIFIED', 'PREPARING', 'READY', 'PICKED_UP'];

export function canTransition(from: OrderStatus, to: OrderStatus, method: PaymentMethod, paymentVerified: boolean) {
  if (!TRANSITIONS[from].includes(to)) return false;
  // Non-cash orders need a verified payment before they can be prepared.
  if (from === 'RECEIVED' && to === 'PREPARING' && method !== 'CASH') return false;
  if (to === 'PAYMENT_VERIFIED' && !paymentVerified) return false;
  return true;
}

// ─── Codes ──────────────────────────────────────────────────────────────────

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O/1/I/L confusion

export function orderCode() {
  const bytes = randomBytes(5);
  return `SC-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

export const secretToken = () => randomBytes(24).toString('base64url');

// ─── Checkout holds ─────────────────────────────────────────────────────────

/**
 * Start (or refresh) the 15-minute stock hold for the visitor's bag.
 * Returns the hold expiry and any lines that can't be fulfilled.
 */
export async function holdCart(cart: CartWithItems) {
  await purgeExpiredHolds();
  const lines = cart.items.filter((i) => !i.savedForLater);
  const avail = await availability(
    lines.map((l) => l.variantId),
    cart.id,
  );
  const expiresAt = new Date(Date.now() + school.policy.checkoutHoldMinutes * 60_000);
  const issues: string[] = [];
  const want = new Map<string, number>();
  for (const l of lines) want.set(l.variantId, (want.get(l.variantId) ?? 0) + l.qty);

  await db.$transaction(async (tx) => {
    await tx.stockHold.deleteMany({ where: { cartId: cart.id } });
    const holds: Prisma.StockHoldCreateManyInput[] = [];
    for (const [variantId, qty] of want) {
      const line = lines.find((l) => l.variantId === variantId)!;
      const can = Math.min(qty, avail[variantId] ?? 0);
      if (can < qty && !line.variant.product.allowPreorder) issues.push(line.id);
      if (can > 0) holds.push({ cartId: cart.id, variantId, qty: can, expiresAt });
    }
    if (holds.length) await tx.stockHold.createMany({ data: holds });
  });
  return { expiresAt: expiresAt.toISOString(), issues };
}

// ─── Order creation ─────────────────────────────────────────────────────────

export type CreateOrderInput = {
  name: string;
  email: string;
  phone: string;
  pickupName: string;
  pickupPhone: string;
  slotId: string | null;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  idempotencyKey: string;
  locale: string;
};

/**
 * Create an order from the bag in ONE transaction:
 *  - locks the variant rows (SELECT … FOR UPDATE) so concurrent checkouts
 *    serialize per SKU and stock can never be oversold;
 *  - books the pickup slot atomically (booked < capacity);
 *  - snapshots names/prices, decrements stock, logs movements;
 *  - is idempotent on `idempotencyKey` (double taps, retries, refreshes).
 */
export async function createOrderFromCart(cart: CartWithItems, userId: string | null, input: CreateOrderInput) {
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;

  const settings = await getSettings();
  const provider = PROVIDERS[input.paymentMethod];
  if (!provider.enabled(settings.payments)) throw new ActionError('METHOD_DISABLED');

  const lines = cart.items.filter((i) => !i.savedForLater);
  if (!lines.length) throw new ActionError('EMPTY_CART');

  const rules = await bundleRules([...new Set(lines.map((l) => l.bundleId).filter(Boolean) as string[])]);
  const promo = await findPromo(cart.promoCode);
  const pricing = priceCart(
    lines.map((l) => ({
      id: l.id,
      productId: l.variant.productId,
      unitPriceCents: l.variant.priceCents,
      qty: l.qty,
      bundleId: l.bundleId,
      bundleGroup: l.bundleGroup,
    })),
    rules,
    promo,
  );
  const holdDays = provider.holdDays(settings.store);

  try {
    return await db.$transaction(
      async (tx) => {
        const variantIds = [...new Set(lines.map((l) => l.variantId))];
        const locked = await tx.$queryRaw<{ id: string; stock: number; priceCents: number; active: boolean }[]>`
          SELECT id, stock, "priceCents", active FROM "Variant" WHERE id IN (${Prisma.join(variantIds)}) ORDER BY id FOR UPDATE`;
        const otherHolds = await tx.stockHold.groupBy({
          by: ['variantId'],
          where: { variantId: { in: variantIds }, expiresAt: { gt: new Date() }, cartId: { not: cart.id } },
          _sum: { qty: true },
        });
        const free = new Map(locked.map((v) => [v.id, v.stock - (otherHolds.find((h) => h.variantId === v.id)?._sum.qty ?? 0)]));

        // Decide fulfil vs pre-order per line, against locked stock.
        const plan = lines.map((l) => {
          const v = locked.find((x) => x.id === l.variantId);
          if (!v || !v.active || l.variant.product.status !== 'ACTIVE') throw new ActionError('STOCK_CHANGED');
          if (v.priceCents !== l.variant.priceCents) throw new ActionError('STOCK_CHANGED');
          const left = free.get(l.variantId) ?? 0;
          if (left >= l.qty) {
            free.set(l.variantId, left - l.qty);
            return { line: l, preorder: false };
          }
          if (l.variant.product.allowPreorder) return { line: l, preorder: true };
          throw new ActionError('STOCK_CHANGED');
        });

        if (input.slotId) {
          const booked = await tx.$executeRaw`
            UPDATE "PickupSlot" SET booked = booked + 1
            WHERE id = ${input.slotId} AND active = true AND booked < capacity AND "startsAt" > now()`;
          if (booked !== 1) throw new ActionError('SLOT_FULL');
        }

        let code = orderCode();
        while (await tx.order.findUnique({ where: { code }, select: { id: true } })) code = orderCode();

        const order = await tx.order.create({
          data: {
            code,
            userId,
            email: input.email.toLowerCase(),
            name: input.name,
            phone: input.phone,
            pickupName: input.pickupName,
            pickupPhone: input.pickupPhone,
            pickupSlotId: input.slotId,
            paymentMethod: input.paymentMethod,
            subtotalCents: pricing.subtotalCents,
            discountCents: pricing.bundleDiscountCents + pricing.promoDiscountCents,
            totalCents: pricing.totalCents,
            promoCode: promo?.code ?? null,
            notes: input.notes || null,
            locale: input.locale,
            idempotencyKey: input.idempotencyKey,
            pickupToken: secretToken(),
            expiresAt: holdDays ? addDays(new Date(), holdDays) : null,
            items: {
              create: plan.map(({ line: l, preorder }) => ({
                variantId: l.variantId,
                productId: l.variant.productId,
                productName: input.locale === 'en' ? l.variant.product.nameEn : l.variant.product.nameEs,
                productSlug: l.variant.product.slug,
                garmentType: l.variant.product.garmentType,
                image: l.variant.product.images[0]?.url ?? null,
                sku: l.variant.sku,
                size: l.variant.size,
                color: l.variant.color,
                qty: l.qty,
                unitPriceCents: l.variant.priceCents,
                discountCents: pricing.lineDiscounts[l.id] ?? 0,
                studentId: l.studentId,
                studentName: l.student?.name ?? null,
                studentGrade: l.student?.grade ?? null,
                bundleId: l.bundleId,
                bundleName: l.bundleId ? (rules[l.bundleId]?.nameEs ?? null) : null,
                preorder,
              })),
            },
            events: { create: { status: 'RECEIVED', type: 'status' } },
          },
        });

        // Decrement stock (fulfilled lines only) + movement log.
        const dec = new Map<string, number>();
        for (const p of plan) if (!p.preorder) dec.set(p.line.variantId, (dec.get(p.line.variantId) ?? 0) + p.line.qty);
        for (const [variantId, qty] of dec) {
          const v = await tx.variant.update({ where: { id: variantId }, data: { stock: { decrement: qty } } });
          await tx.stockMovement.create({ data: { variantId, delta: -qty, stockAfter: v.stock, reason: 'SALE', orderId: order.id, actorId: userId } });
        }

        if (promo) await tx.promoCode.update({ where: { code: promo.code }, data: { uses: { increment: 1 } } });

        // Remember sizes per student from what they bought.
        const byStudent = new Map<string, { g: string; size: string }[]>();
        for (const l of lines) {
          const g = l.variant.product.garmentType;
          if (l.studentId && g && SIZED_GARMENTS.includes(g as GarmentType)) byStudent.set(l.studentId, [...(byStudent.get(l.studentId) ?? []), { g, size: l.variant.size }]);
        }
        for (const [studentId, sizes] of byStudent) {
          const s = await tx.student.findUnique({ where: { id: studentId }, select: { sizes: true } });
          let json: Prisma.InputJsonObject = withSize(s?.sizes, sizes[0].g, sizes[0].size);
          for (const x of sizes.slice(1)) json = withSize(json as Prisma.JsonObject, x.g, x.size);
          await tx.student.update({ where: { id: studentId }, data: { sizes: json } });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
        await tx.stockHold.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { promoCode: null } });
        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
  } catch (e) {
    // A concurrent duplicate submit with the same key loses the unique race.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const again = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return again;
    }
    throw e;
  }
}

// ─── Status changes (admin + system) ────────────────────────────────────────

/** Return stock and free the slot for a cancelled/expired order. */
async function release(tx: Tx, orderId: string, reason: 'CANCEL', actorId: string | null) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  for (const it of order.items) {
    if (it.preorder || !it.variantId) continue;
    const v = await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } }).catch(() => null);
    if (v) await tx.stockMovement.create({ data: { variantId: it.variantId, delta: it.qty, stockAfter: v.stock, reason, orderId, actorId } });
  }
  if (order.pickupSlotId) {
    await tx.$executeRaw`UPDATE "PickupSlot" SET booked = GREATEST(booked - 1, 0) WHERE id = ${order.pickupSlotId}`;
  }
}

export async function transitionOrder(orderId: string, to: OrderStatus, actorId: string | null, note?: string) {
  return db.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<{ id: string; status: OrderStatus; paymentMethod: PaymentMethod; paymentStatus: string }[]>`
      SELECT id, status, "paymentMethod", "paymentStatus" FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    if (!order) throw new ActionError('NOT_FOUND');
    if (order.status === to) return order;
    if (!canTransition(order.status, to, order.paymentMethod, order.paymentStatus === 'VERIFIED')) throw new ActionError('INVALID_STATUS');
    if (to === 'CANCELLED' || to === 'EXPIRED') await release(tx, orderId, 'CANCEL', actorId);
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(to === 'PICKED_UP' ? { pickedUpAt: new Date(), pickedUpById: actorId } : {}),
        // Cash is collected at pickup.
        ...(to === 'PICKED_UP' && order.paymentMethod === 'CASH' ? { paymentStatus: 'VERIFIED' } : {}),
      },
    });
    await tx.orderEvent.create({ data: { orderId, status: to, type: 'status', note: note ?? null, actorId } });
    return { ...order, status: to };
  });
}

/** Template to send after a status change. */
export function templateFor(status: OrderStatus) {
  return (
    {
      PAYMENT_VERIFIED: 'payment_verified',
      PREPARING: 'order_preparing',
      READY: 'ready_for_pickup',
      PICKED_UP: 'picked_up',
      CANCELLED: 'order_cancelled',
      EXPIRED: 'order_expired',
      RECEIVED: null,
    } as const
  )[status];
}

/** Expire unpaid pay-at-school reservations past their deadline. */
export async function expireStaleOrders() {
  const stale = await db.order.findMany({
    where: { status: 'RECEIVED', paymentStatus: { in: ['PENDING', 'REJECTED'] }, expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const o of stale) await transitionOrder(o.id, 'EXPIRED', null, 'auto-expired').catch(() => null);
  await purgeExpiredHolds();
  return stale.map((o) => o.id);
}

/** Can the current visitor see this order? (owner, token holder, or staff) */
export function canViewOrder(order: { userId: string | null; pickupToken: string }, viewer: { id: string; role: string } | null, token?: string | null) {
  if (viewer && viewer.role !== 'CUSTOMER') return true;
  if (viewer && order.userId === viewer.id) return true;
  if (!token || token.length !== order.pickupToken.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(order.pickupToken));
}
