import 'server-only';
import { db } from '@/lib/db';

/** Bookable pickup slots: active and starting at least 30 minutes from now. */
export function upcomingSlots(take = 12) {
  return db.pickupSlot.findMany({
    where: { active: true, startsAt: { gt: new Date(Date.now() + 30 * 60_000) } },
    orderBy: { startsAt: 'asc' },
    take,
  });
}
