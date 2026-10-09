import 'server-only';
import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { readCartToken, ensureCartToken, rotateCartToken } from '@/lib/cart-token';
import { availability } from '@/lib/stock';
import { priceCart, type BundleRule, type Promo } from '@/lib/pricing';
import { loc } from '@/lib/utils';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      variant: { include: { product: { include: { images: { orderBy: { sort: 'asc' }, take: 1 } } } } },
    },
  },
} satisfies Prisma.CartInclude;
export type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

/** Find the visitor's cart (read-only; never creates). */
export const findCart = cache(async (): Promise<CartWithItems | null> => {
  const user = await getCurrentUser();
  if (user) {
    const c = await db.cart.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, include: cartInclude });
    if (c) return c;
  }
  const token = await readCartToken();
  if (!token) return null;
  const c = await db.cart.findUnique({ where: { token }, include: cartInclude });
  if (c && c.userId && c.userId !== user?.id) return null; // someone else's cart on a shared device
  return c;
});

/** Find or create (actions only: may set a cookie). */
export async function getOrCreateCart() {
  const user = await getCurrentUser();
  if (user) {
    const c = await db.cart.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } });
    if (c) return c;
  }
  const token = await ensureCartToken();
  const existing = await db.cart.findUnique({ where: { token } });
  if (existing) {
    if (user && !existing.userId) return db.cart.update({ where: { id: existing.id }, data: { userId: user.id } });
    if (!existing.userId || existing.userId === user?.id) return existing;
  }
  // Cookie points at another account's cart (shared device): start fresh.
  const fresh = existing ? await rotateCartToken() : token;
  return db.cart.create({ data: { token: fresh, userId: user?.id ?? null } });
}

export async function favoriteOwnerKey(create = false): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return `u:${user.id}`;
  const token = create ? await ensureCartToken() : await readCartToken();
  return token ? `c:${token}` : null;
}

export async function bundleRules(bundleIds: string[]): Promise<Record<string, BundleRule & { nameEs: string; nameEn: string }>> {
  if (!bundleIds.length) return {};
  const bundles = await db.bundle.findMany({ where: { id: { in: bundleIds } }, include: { items: true } });
  return Object.fromEntries(
    bundles.map((b) => [
      b.id,
      {
        discountPct: b.discountPct,
        nameEs: b.nameEs,
        nameEn: b.nameEn,
        required: b.items.filter((i) => !i.optional).map((i) => ({ productId: i.productId, qty: i.qty })),
      },
    ]),
  );
}

export async function findPromo(code: string | null | undefined): Promise<Promo> {
  if (!code) return null;
  const p = await db.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!p || !p.active) return null;
  if (p.expiresAt && p.expiresAt < new Date()) return null;
  if (p.maxUses != null && p.uses >= p.maxUses) return null;
  return { code: p.code, pct: p.pct, amountCents: p.amountCents };
}

export type CartLineView = {
  id: string;
  productId: string;
  productSlug: string;
  name: string;
  image: string | null;
  imageBlur: string | null;
  size: string;
  color: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  lineDiscountCents: number;
  studentId: string | null;
  studentName: string | null;
  savedForLater: boolean;
  bundleId: string | null;
  bundleName: string | null;
  bundleGroup: string | null;
  available: number;
  preorder: boolean;
  preorderDate: string | null;
  insufficient: boolean;
  garmentType: string | null;
};

export type CartView = {
  cartId: string | null;
  lines: CartLineView[];
  saved: CartLineView[];
  pricing: ReturnType<typeof priceCart>;
  promoCode: string | null;
  count: number;
};

export async function getCartView(locale: string): Promise<CartView> {
  const cart = await findCart();
  const empty: CartView = {
    cartId: cart?.id ?? null,
    lines: [],
    saved: [],
    promoCode: null,
    count: 0,
    pricing: priceCart([], {}),
  };
  if (!cart || !cart.items.length) return empty;
  const avail = await availability(
    cart.items.map((i) => i.variantId),
    cart.id,
  );
  const rules = await bundleRules([...new Set(cart.items.map((i) => i.bundleId).filter(Boolean) as string[])]);
  const promo = await findPromo(cart.promoCode);
  const pricing = priceCart(
    cart.items.map((i) => ({
      id: i.id,
      productId: i.variant.productId,
      unitPriceCents: i.variant.priceCents,
      qty: i.qty,
      savedForLater: i.savedForLater,
      bundleId: i.bundleId,
      bundleGroup: i.bundleGroup,
    })),
    rules,
    promo,
  );
  const views: CartLineView[] = cart.items.map((i) => {
    const p = i.variant.product;
    const available = avail[i.variantId] ?? 0;
    const preorder = available < i.qty && p.allowPreorder;
    return {
      id: i.id,
      productId: p.id,
      productSlug: p.slug,
      name: loc(p, 'name', locale),
      image: p.images[0]?.url ?? null,
      imageBlur: p.images[0]?.blur ?? null,
      size: i.variant.size,
      color: i.variant.color,
      qty: i.qty,
      unitPriceCents: i.variant.priceCents,
      lineTotalCents: i.variant.priceCents * i.qty,
      lineDiscountCents: pricing.lineDiscounts[i.id] ?? 0,
      studentId: i.studentId,
      studentName: i.student?.name ?? null,
      savedForLater: i.savedForLater,
      bundleId: i.bundleId,
      bundleName: i.bundleId && rules[i.bundleId] ? (locale === 'en' ? rules[i.bundleId].nameEn : rules[i.bundleId].nameEs) : null,
      bundleGroup: i.bundleGroup,
      available,
      preorder,
      preorderDate: p.preorderDate?.toISOString() ?? null,
      insufficient: available < i.qty && !p.allowPreorder,
      garmentType: p.garmentType,
    };
  });
  return {
    cartId: cart.id,
    lines: views.filter((v) => !v.savedForLater),
    saved: views.filter((v) => v.savedForLater),
    pricing,
    promoCode: promo?.code ?? null,
    count: pricing.itemCount,
  };
}

export async function getCartCount(): Promise<number> {
  const cart = await findCart();
  return cart?.items.filter((i) => !i.savedForLater).reduce((s, i) => s + i.qty, 0) ?? 0;
}
