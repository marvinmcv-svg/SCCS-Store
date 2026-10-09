/** Pure order rules (no I/O): status machine, codes, access. */
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { OrderStatus, PaymentMethod } from '@prisma/client';

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


/** Can the current visitor see this order? (owner, token holder, or staff) */
export function canViewOrder(order: { userId: string | null; pickupToken: string }, viewer: { id: string; role: string } | null, token?: string | null) {
  if (viewer && viewer.role !== 'CUSTOMER') return true;
  if (viewer && order.userId === viewer.id) return true;
  if (!token || token.length !== order.pickupToken.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(order.pickupToken));
}
