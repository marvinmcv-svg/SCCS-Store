/**
 * Money is stored as integer centavos everywhere (no floats).
 * Display follows es-BO: "Bs 120,00". English UI keeps the same Bolivian
 * formatting so prices read identically on receipts and transfers.
 */
const formatter = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBs(cents: number): string {
  // Intl renders "Bs" for BOB in es-BO; normalise the narrow no-break space.
  return formatter.format(cents / 100).replace(/ /g, ' ');
}

export function toCents(bs: number | string): number {
  const n = typeof bs === 'string' ? Number(bs.replace(/\./g, '').replace(',', '.')) : bs;
  if (!Number.isFinite(n)) throw new Error('Invalid amount');
  return Math.round(n * 100);
}

export function pctOf(cents: number, pct: number): number {
  return Math.round((cents * pct) / 100);
}
