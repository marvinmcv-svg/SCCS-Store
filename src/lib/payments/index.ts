import type { PaymentMethod } from '@prisma/client';
import type { PaymentProvider } from './types';
import type { PaymentSettings } from '@/lib/settings';

/** Interbank QR (QR bancario / QR Simple): parent pays from their banking app. */
const qr: PaymentProvider = {
  id: 'QR',
  enabled: (s) => s.qrEnabled,
  requiresProof: true,
  holdDays: () => null,
};

const transfer: PaymentProvider = {
  id: 'TRANSFER',
  enabled: (s) => s.transferEnabled,
  requiresProof: true,
  holdDays: () => null,
};

/** Cash or card at the school when collecting; stock is reserved N days. */
const cash: PaymentProvider = {
  id: 'CASH',
  enabled: (s) => s.cashEnabled,
  requiresProof: false,
  holdDays: (s) => s.payAtSchoolHoldDays,
};

/**
 * Card gateway placeholder (e.g. a local processor). Disabled until a
 * provider is contracted; implement createIntent + webhook then.
 */
const card: PaymentProvider = {
  id: 'CARD',
  enabled: () => false,
  requiresProof: false,
  holdDays: () => null,
};

export const PROVIDERS: Record<PaymentMethod, PaymentProvider> = { QR: qr, TRANSFER: transfer, CASH: cash, CARD: card };

/**
 * The store takes payment by QR only: families pay with the bank QR and send
 * the order and receipt over WhatsApp. Transfer/cash/card stay defined so
 * older orders still render, but they can't be chosen at checkout.
 */
export const CHECKOUT_METHODS: PaymentMethod[] = ['QR'];

export function enabledMethods(_settings: PaymentSettings): PaymentMethod[] {
  return CHECKOUT_METHODS;
}
