import { NextResponse } from 'next/server';
import { expireStaleOrders } from '@/lib/orders';
import { notifyOrder } from '@/lib/notify';

/**
 * Expires unpaid pay-at-school reservations and purges stale stock holds.
 * Call every 15 minutes (Railway cron service or any scheduler) with
 *   Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Unauthorized', { status: 401 });
  const expired = await expireStaleOrders();
  await Promise.all(expired.map((id) => notifyOrder(id, 'order_expired')));
  return NextResponse.json({ ok: true, expired: expired.length });
}
