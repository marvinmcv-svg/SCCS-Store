import type { PaymentMethod } from '@prisma/client';
import type { PaymentSettings } from '@/lib/settings';

/**
 * Payment provider abstraction. v1 providers are manual (school staff
 * verifies), but a card gateway can implement the same interface later:
 * `createIntent` would return a redirect URL and a webhook would call
 * `markVerified`. Card data never touches our servers.
 */
export interface PaymentProvider {
  id: PaymentMethod;
  /** Shown at checkout; false hides the option. */
  enabled(settings: PaymentSettings): boolean;
  /** Parent must upload a receipt or transaction number. */
  requiresProof: boolean;
  /** Days the order (and its stock) stays reserved before expiring; null = never. */
  holdDays(settings: { payAtSchoolHoldDays: number }): number | null;
  /** Optional: online gateways create an intent and return a redirect. */
  createIntent?(order: { id: string; code: string; totalCents: number }): Promise<{ redirectUrl: string }>;
}
