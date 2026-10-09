import { describe, expect, it } from 'vitest';
import { allocate, priceCart, type PricingLine } from '@/lib/pricing';

const kit = { discountPct: 10, required: [{ productId: 'polo', qty: 2 }, { productId: 'bermuda', qty: 1 }] };
const line = (id: string, productId: string, unit: number, qty: number, extra: Partial<PricingLine> = {}): PricingLine => ({ id, productId, unitPriceCents: unit, qty, ...extra });

describe('priceCart', () => {
  it('sums active lines and ignores saved-for-later', () => {
    const r = priceCart([line('a', 'polo', 12000, 2), line('b', 'cap', 9000, 1, { savedForLater: true })], {});
    expect(r.subtotalCents).toBe(24000);
    expect(r.totalCents).toBe(24000);
    expect(r.itemCount).toBe(2);
  });

  it('applies the bundle discount only when every required piece is present', () => {
    const lines = [line('a', 'polo', 12000, 2, { bundleId: 'k', bundleGroup: 'g1' }), line('b', 'bermuda', 14000, 1, { bundleId: 'k', bundleGroup: 'g1' })];
    const ok = priceCart(lines, { k: kit });
    expect(ok.bundleDiscountCents).toBe(3800); // 10% of 38 000
    expect(ok.totalCents).toBe(34200);
    expect(ok.validBundleGroups).toEqual(['g1']);

    // Removing a required piece (or reducing its qty) voids the discount.
    const broken = priceCart([{ ...lines[0], qty: 1 }, lines[1]], { k: kit });
    expect(broken.bundleDiscountCents).toBe(0);
  });

  it('allocates line discounts that add up exactly', () => {
    const lines = [line('a', 'polo', 12000, 2, { bundleId: 'k', bundleGroup: 'g' }), line('b', 'bermuda', 14000, 1, { bundleId: 'k', bundleGroup: 'g' })];
    const r = priceCart(lines, { k: { ...kit, discountPct: 7 } });
    expect(Object.values(r.lineDiscounts).reduce((s, n) => s + n, 0)).toBe(r.bundleDiscountCents);
  });

  it('applies percent and fixed promos after bundles and never below zero', () => {
    const lines = [line('a', 'polo', 10000, 1)];
    expect(priceCart(lines, {}, { code: 'X', pct: 10 }).totalCents).toBe(9000);
    expect(priceCart(lines, {}, { code: 'Y', amountCents: 25000 }).totalCents).toBe(0);
  });
});

describe('allocate', () => {
  it('distributes the remainder to the largest weight', () => {
    expect(allocate(10, [{ id: 'a', w: 1 }, { id: 'b', w: 2 }])).toEqual({ a: 3, b: 7 });
    expect(allocate(0, [{ id: 'a', w: 1 }])).toEqual({ a: 0 });
  });
});
