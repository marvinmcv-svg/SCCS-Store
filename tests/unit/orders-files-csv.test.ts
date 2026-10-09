import { describe, expect, it } from 'vitest';
import { canTransition, orderCode, canViewOrder } from '@/lib/order-rules';
import { sniffType } from '@/lib/storage';
import { parseCsv, toCsv } from '@/lib/csv';

describe('order state machine', () => {
  it('follows the pickup lifecycle', () => {
    expect(canTransition('RECEIVED', 'PAYMENT_VERIFIED', 'QR', true)).toBe(true);
    expect(canTransition('RECEIVED', 'PAYMENT_VERIFIED', 'QR', false)).toBe(false);
    expect(canTransition('PREPARING', 'READY', 'QR', true)).toBe(true);
    expect(canTransition('READY', 'PICKED_UP', 'TRANSFER', true)).toBe(true);
    expect(canTransition('PICKED_UP', 'CANCELLED', 'QR', true)).toBe(false);
  });
  it('only lets pay-at-school orders be prepared before payment', () => {
    expect(canTransition('RECEIVED', 'PREPARING', 'CASH', false)).toBe(true);
    expect(canTransition('RECEIVED', 'PREPARING', 'QR', false)).toBe(false);
  });
});

describe('order codes and access', () => {
  it('generates unambiguous codes', () => {
    for (let i = 0; i < 50; i++) expect(orderCode()).toMatch(/^SC-[2-9A-HJ-KM-NP-Z]{5}$/);
  });
  it('requires owner, staff or the secret token', () => {
    const order = { userId: 'u1', pickupToken: 'abcdefghijklmnopqrstuvwx' };
    expect(canViewOrder(order, { id: 'u1', role: 'CUSTOMER' })).toBe(true);
    expect(canViewOrder(order, { id: 'u2', role: 'CUSTOMER' })).toBe(false);
    expect(canViewOrder(order, { id: 'u2', role: 'STAFF' })).toBe(true);
    expect(canViewOrder(order, null, 'abcdefghijklmnopqrstuvwx')).toBe(true);
    expect(canViewOrder(order, null, 'abcdefghijklmnopqrstuvwX')).toBe(false);
    expect(canViewOrder(order, null, 'short')).toBe(false);
  });
});

describe('upload sniffing', () => {
  it('detects real types from magic bytes', () => {
    expect(sniffType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(sniffType(Buffer.from('%PDF-1.7 xxxxxxx'))).toBe('application/pdf');
    expect(sniffType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('image/webp');
    expect(sniffType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });
});

describe('csv', () => {
  it('parses quotes, commas and CRLF', () => {
    expect(parseCsv('sku,stock\r\n"POL-8",12\n"A ""q"", b",3\n')).toEqual([
      ['sku', 'stock'],
      ['POL-8', '12'],
      ['A "q", b', '3'],
    ]);
  });
  it('escapes on export', () => {
    expect(toCsv([{ a: 'x,y', b: 'he said "hi"' }])).toBe('a,b\n"x,y","he said ""hi"""');
  });
});
