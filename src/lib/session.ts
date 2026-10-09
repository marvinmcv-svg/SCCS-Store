import 'server-only';
import { cache } from 'react';
import type { Role } from '@prisma/client';
import { auth } from '@/auth';
import { db } from '@/lib/db';

/** Current user, re-read from the DB (authoritative role, disabled flag). */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, phone: true, role: true, locale: true, disabled: true, notifyEmail: true, notifyWhatsapp: true },
  });
  if (!user || user.disabled) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

const RANK: Record<Role, number> = { CUSTOMER: 0, STAFF: 1, ADMIN: 2, OWNER: 3 };

export function hasRole(user: { role: Role } | null | undefined, min: Role) {
  return !!user && RANK[user.role] >= RANK[min];
}

export class AuthError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'FORBIDDEN') {
    super(code);
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('UNAUTHENTICATED');
  return user;
}

/** RBAC gate for server actions / route handlers. Never trust the client. */
export async function requireRole(min: Role) {
  const user = await requireUser();
  if (!hasRole(user, min)) throw new AuthError('FORBIDDEN');
  return user;
}

/** Fine-grained permissions on top of role rank. */
export const can = {
  manageCatalog: (u: { role: Role }) => hasRole(u, 'ADMIN'),
  manageInventory: (u: { role: Role }) => hasRole(u, 'ADMIN'),
  manageOrders: (u: { role: Role }) => hasRole(u, 'STAFF'),
  verifyPayments: (u: { role: Role }) => hasRole(u, 'STAFF'),
  managePickups: (u: { role: Role }) => hasRole(u, 'STAFF'),
  manageContent: (u: { role: Role }) => hasRole(u, 'ADMIN'),
  viewReports: (u: { role: Role }) => hasRole(u, 'ADMIN'),
  manageSettings: (u: { role: Role }) => hasRole(u, 'ADMIN'),
  manageUsers: (u: { role: Role }) => hasRole(u, 'OWNER'),
  viewAudit: (u: { role: Role }) => hasRole(u, 'ADMIN'),
};
