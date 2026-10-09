/**
 * Pure pricing engine (no I/O) shared by bag, checkout and order creation,
 * so the number a parent sees is the number they are charged.
 *
 * Rules
 * - Saved-for-later lines are ignored.
 * - A bundle discount applies to a bundle group only while every required
 *   (non-optional) piece is still present in the required quantity. This
 *   stops "add kit, remove the expensive pieces, keep the discount".
 * - Promo codes apply after bundle discounts and never go below zero.
 */
export type PricingLine = {
  id: string;
  productId: string;
  unitPriceCents: number;
  qty: number;
  savedForLater?: boolean;
  bundleId?: string | null;
  bundleGroup?: string | null;
};

export type BundleRule = { discountPct: number; required: { productId: string; qty: number }[] };
export type Promo = { code: string; pct?: number | null; amountCents?: number | null } | null;

export type PricingResult = {
  subtotalCents: number;
  bundleDiscountCents: number;
  promoDiscountCents: number;
  totalCents: number;
  /** Per-line discount allocation (bundle + promo), for order items. */
  lineDiscounts: Record<string, number>;
  validBundleGroups: string[];
  itemCount: number;
};

/** Split `amount` across weights proportionally; remainder goes to the largest weight. */
export function allocate(amount: number, weights: { id: string; w: number }[]): Record<string, number> {
  const total = weights.reduce((s, x) => s + x.w, 0);
  const out: Record<string, number> = {};
  if (!amount || !total) return Object.fromEntries(weights.map((x) => [x.id, 0]));
  let given = 0;
  for (const x of weights) {
    out[x.id] = Math.floor((amount * x.w) / total);
    given += out[x.id];
  }
  const rest = amount - given;
  if (rest && weights.length) {
    const biggest = [...weights].sort((a, b) => b.w - a.w)[0];
    out[biggest.id] += rest;
  }
  return out;
}

export function priceCart(lines: PricingLine[], bundles: Record<string, BundleRule>, promo: Promo = null): PricingResult {
  const active = lines.filter((l) => !l.savedForLater && l.qty > 0);
  const subtotal = active.reduce((s, l) => s + l.unitPriceCents * l.qty, 0);
  const lineDiscounts: Record<string, number> = Object.fromEntries(active.map((l) => [l.id, 0]));

  // Bundle groups
  const groups = new Map<string, PricingLine[]>();
  for (const l of active) {
    if (l.bundleGroup && l.bundleId) groups.set(l.bundleGroup, [...(groups.get(l.bundleGroup) ?? []), l]);
  }
  let bundleDiscount = 0;
  const validBundleGroups: string[] = [];
  for (const [group, gl] of groups) {
    const rule = bundles[gl[0].bundleId!];
    if (!rule) continue;
    const complete = rule.required.every((r) => gl.filter((l) => l.productId === r.productId).reduce((s, l) => s + l.qty, 0) >= r.qty);
    if (!complete) continue;
    const groupSubtotal = gl.reduce((s, l) => s + l.unitPriceCents * l.qty, 0);
    const d = Math.round((groupSubtotal * rule.discountPct) / 100);
    bundleDiscount += d;
    validBundleGroups.push(group);
    const alloc = allocate(
      d,
      gl.map((l) => ({ id: l.id, w: l.unitPriceCents * l.qty })),
    );
    for (const [id, v] of Object.entries(alloc)) lineDiscounts[id] += v;
  }

  // Promo
  const afterBundles = subtotal - bundleDiscount;
  let promoDiscount = 0;
  if (promo && afterBundles > 0) {
    if (promo.pct) promoDiscount = Math.round((afterBundles * Math.min(100, Math.max(0, promo.pct))) / 100);
    else if (promo.amountCents) promoDiscount = Math.min(afterBundles, Math.max(0, promo.amountCents));
    const alloc = allocate(
      promoDiscount,
      active.map((l) => ({ id: l.id, w: l.unitPriceCents * l.qty - lineDiscounts[l.id] })),
    );
    for (const [id, v] of Object.entries(alloc)) lineDiscounts[id] += v;
  }

  return {
    subtotalCents: subtotal,
    bundleDiscountCents: bundleDiscount,
    promoDiscountCents: promoDiscount,
    totalCents: Math.max(0, subtotal - bundleDiscount - promoDiscount),
    lineDiscounts,
    validBundleGroups,
    itemCount: active.reduce((s, l) => s + l.qty, 0),
  };
}
