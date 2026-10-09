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

export function enabledMethods(settings: PaymentSettings): PaymentMethod[] {
  return (Object.keys(PROVIDERS) as PaymentMethod[]).filter((m) => PROVIDERS[m].enabled(settings));
}
