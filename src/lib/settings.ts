import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { school } from '@/config/school';

/**
 * Runtime-editable store settings (Admin → Settings). Falls back to
 * config/school.ts so a fresh install works with placeholders.
 */
export const paymentSettingsSchema = z.object({
  bankName: z.string().min(1),
  accountHolder: z.string().min(1),
  accountNumber: z.string().min(1),
  accountTypeEs: z.string().min(1),
  accountTypeEn: z.string().min(1),
  nit: z.string().min(1),
  qrImage: z.string().min(1),
  qrEnabled: z.boolean(),
  transferEnabled: z.boolean(),
  cashEnabled: z.boolean(),
});
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export const storeSettingsSchema = z.object({
  whatsapp: z.string().min(6),
  storeEmail: z.string().email(),
  pickupLocationEs: z.string().min(1),
  pickupLocationEn: z.string().min(1),
  exchangeDays: z.coerce.number().int().min(0).max(90),
  payAtSchoolHoldDays: z.coerce.number().int().min(1).max(30),
});
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

const defaults = {
  payments: {
    bankName: school.bank.bankName,
    accountHolder: school.bank.accountHolder,
    accountNumber: school.bank.accountNumber,
    accountTypeEs: school.bank.accountType.es,
    accountTypeEn: school.bank.accountType.en,
    nit: school.bank.nit,
    qrImage: school.qrImage,
    qrEnabled: true,
    transferEnabled: true,
    cashEnabled: true,
  } satisfies PaymentSettings,
  store: {
    whatsapp: school.whatsapp,
    storeEmail: school.storeEmail,
    pickupLocationEs: school.pickupLocation.es,
    pickupLocationEn: school.pickupLocation.en,
    exchangeDays: school.policy.exchangeDays,
    payAtSchoolHoldDays: school.policy.payAtSchoolHoldDays,
  } satisfies StoreSettings,
};

export const SETTINGS_TAG = 'settings';

export const getSettings = unstable_cache(
  async () => {
    const rows = await db.setting.findMany({ where: { key: { in: ['payments', 'store'] } } });
    const get = (k: string) => rows.find((r) => r.key === k)?.value as Record<string, unknown> | undefined;
    return {
      payments: { ...defaults.payments, ...(get('payments') ?? {}) } as PaymentSettings,
      store: { ...defaults.store, ...(get('store') ?? {}) } as StoreSettings,
    };
  },
  ['settings'],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

export function pickupLocation(s: StoreSettings, locale: string) {
  return locale === 'en' ? s.pickupLocationEn : s.pickupLocationEs;
}
