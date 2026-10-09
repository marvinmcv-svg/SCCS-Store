import { describe, expect, it } from 'vitest';
import { formatBs, toCents } from '@/lib/money';
import { recommendSize } from '@/config/sizing';
import { needsRecheck, parseSizes, withSize } from '@/lib/students';
import { divisionOf, gradeLabel, sizeSort } from '@/config/catalog';

describe('money', () => {
  it('formats BOB in es-BO', () => {
    expect(formatBs(12000)).toBe('Bs 120,00');
    expect(formatBs(120050)).toBe('Bs 1.200,50');
  });
  it('parses amounts to integer centavos', () => {
    expect(toCents(120.5)).toBe(12050);
    expect(toCents('1.200,50')).toBe(120050);
  });
});

describe('sizing helper', () => {
  it('recommends by height and sizes up near the top of a range', () => {
    expect(recommendSize({ heightCm: 125 })).toBe('8');
    expect(recommendSize({ heightCm: 133 })).toBe('10'); // within 2 cm of the 8's limit → room to grow
  });
  it('falls back to age and respects available sizes', () => {
    expect(recommendSize({ age: 9 })).toBe('10');
    expect(recommendSize({ heightCm: 125 }, ['10', '12'])).toBe('10');
    expect(recommendSize({})).toBeNull();
  });
});

describe('student sizes', () => {
  it('round-trips saved sizes and flags stale ones', () => {
    const json = withSize({}, 'POLO', 'M');
    expect(parseSizes(json as never).POLO.size).toBe('M');
    const old = { size: 'M', updatedAt: new Date(Date.now() - 240 * 86_400_000).toISOString() };
    expect(needsRecheck(old)).toBeGreaterThanOrEqual(7);
    expect(needsRecheck({ size: 'M', updatedAt: new Date().toISOString() })).toBeNull();
  });
  it('ignores malformed json', () => {
    expect(parseSizes(null)).toEqual({});
    expect(parseSizes(['x'])).toEqual({});
  });
});

describe('catalog vocabulary', () => {
  it('maps grades to divisions and labels', () => {
    expect(divisionOf('K')).toBe('early');
    expect(divisionOf('7')).toBe('middle');
    expect(gradeLabel('4', 'es')).toBe('4° grado');
    expect(gradeLabel('PK', 'en')).toBe('Pre-K');
  });
  it('orders sizes kids → adults → one size', () => {
    expect(['M', '4', 'U', '12'].sort((a, b) => sizeSort(a) - sizeSort(b))).toEqual(['4', '12', 'M', 'U']);
  });
});
