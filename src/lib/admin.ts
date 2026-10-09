import 'server-only';
import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser, can, type CurrentUser } from '@/lib/session';

export type Permission = keyof typeof can;

/** Page-level guard. Staff without the permission go back to the dashboard. */
export async function requireAdminPage(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: '/login?callbackUrl=/admin', locale });
  if (user.role === 'CUSTOMER') return redirect({ href: '/', locale });
  if (permission && !can[permission](user)) return redirect({ href: '/admin?denied=1', locale });
  return user;
}

/** Action-level guard (throws AuthError → mapped to FORBIDDEN). */
export { requireRole } from '@/lib/session';

export function csvEscape(v: unknown) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[], headers?: string[]) {
  const cols = headers ?? Object.keys(rows[0] ?? {});
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n');
}

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
