import 'server-only';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { clientIp } from '@/lib/rate-limit';

type Tx = Prisma.TransactionClient | typeof db;

/** Append-only log of sensitive actions (who, what, when, from where). */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta: Prisma.InputJsonValue = {},
  tx: Tx = db,
) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    ip = null; // outside a request (scripts/cron)
  }
  await tx.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta, ip } });
}
