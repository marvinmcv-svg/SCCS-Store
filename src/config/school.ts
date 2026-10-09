/**
 * Single source of truth for school-specific facts.
 *
 * Values marked `PLACEHOLDER` were not available on https://sccs.edu.bo and
 * must be confirmed by the school. Payment details (bank account, QR image)
 * can also be overridden at runtime from Admin → Settings, so the school can
 * change them without a deploy. The values here are the fallback.
 */
export const school = {
  name: 'Santa Cruz Cooperative School',
  shortName: 'SCCS',
  storeName: 'SCCS Store',
  mascot: 'Jaguars',
  founded: 1959,
  website: 'https://sccs.edu.bo',
  address: 'Barrio Las Palmas, Calle Barcelona #1, Santa Cruz de la Sierra, Bolivia',
  mapsUrl: 'https://maps.google.com/?q=Santa+Cruz+Cooperative+School',
  phone: '+591 3 3530808',
  email: 'contactus@sccs.edu.bo',
  instagram: 'sccsjaguars',

  /** PLACEHOLDER: dedicated store inbox. */
  storeEmail: 'tienda@sccs.edu.bo',
  /** PLACEHOLDER: WhatsApp Business number, E.164 without "+". */
  whatsapp: '59170000000',

  /** PLACEHOLDER: where families collect orders. */
  pickupLocation: {
    es: 'Oficina de Administración, campus SCCS',
    en: 'Administration Office, SCCS campus',
  },
  /** PLACEHOLDER: store opening hours shown on Contact. */
  storeHours: {
    es: 'Lunes a viernes, 7:30 – 15:30',
    en: 'Monday to Friday, 7:30 – 15:30',
  },

  /** PLACEHOLDER: bank transfer details (overridable in Admin → Settings). */
  bank: {
    bankName: 'Banco PLACEHOLDER',
    accountHolder: 'Santa Cruz Cooperative School',
    accountNumber: '000-0000000-0-00',
    accountType: { es: 'Cuenta corriente en Bs.', en: 'Checking account (BOB)' },
    nit: '0000000000',
  },
  /** PLACEHOLDER: static QR bancario image. Replace via Admin → Settings. */
  qrImage: '/brand/qr-placeholder.svg',

  policy: {
    /** PLACEHOLDER: days after pickup in which an exchange may be requested. */
    exchangeDays: 15,
    /** PLACEHOLDER: days a "pay at school" order stays reserved. */
    payAtSchoolHoldDays: 3,
    /** Minutes stock is held while a family completes checkout. */
    checkoutHoldMinutes: 15,
    /** PLACEHOLDER: default bundle discount (percent). */
    defaultBundleDiscountPct: 10,
    /** Months after which we ask "Still fits?" about a saved size. */
    sizeRecheckMonths: 6,
  },

  locale: {
    default: 'es',
    supported: ['es', 'en'] as const,
    currency: 'BOB',
    numberLocale: 'es-BO',
    timeZone: 'America/La_Paz',
  },
} as const;

export type Locale = (typeof school.locale.supported)[number];
