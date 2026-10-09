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

export { csvEscape, toCsv, parseCsv } from '@/lib/csv';
