import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export type Period = '7' | '30' | '90' | '365';

/**
 * Reporting queries. Revenue counts orders that weren't cancelled/expired,
 * bucketed by La Paz calendar day. Everything is aggregated in Postgres.
 */
export async function salesReport(period: Period) {
  const days = Number(period);
  const since = new Date(Date.now() - days * 86_400_000);
  const live = Prisma.sql`o.status NOT IN ('CANCELLED','EXPIRED') AND o."createdAt" >= ${since}`;

  const [totals, byDay, best, byGrade, bySize, byMethod, reorder] = await Promise.all([
    db.$queryRaw<{ revenue: bigint | null; orders: bigint; units: bigint | null }[]>`
      SELECT SUM(o."totalCents")::bigint AS revenue, COUNT(DISTINCT o.id)::bigint AS orders,
             (SELECT SUM(i.qty) FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${live})::bigint AS units
      FROM "Order" o WHERE ${live}`,
    db.$queryRaw<{ day: string; revenue: bigint; orders: bigint }[]>`
      SELECT to_char((o."createdAt" AT TIME ZONE 'America/La_Paz')::date, 'YYYY-MM-DD') AS day,
             SUM(o."totalCents")::bigint AS revenue, COUNT(*)::bigint AS orders
      FROM "Order" o WHERE ${live} GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ productId: string; name: string; units: bigint; revenue: bigint }[]>`
      SELECT i."productId", MAX(i."productName") AS name, SUM(i.qty)::bigint AS units,
             SUM(i.qty * i."unitPriceCents" - i."discountCents")::bigint AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${live}
      GROUP BY i."productId" ORDER BY units DESC LIMIT 10`,
    db.$queryRaw<{ grade: string; units: bigint }[]>`
      SELECT COALESCE(i."studentGrade", '—') AS grade, SUM(i.qty)::bigint AS units
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${live}
      GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ size: string; units: bigint }[]>`
      SELECT i.size, SUM(i.qty)::bigint AS units
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE ${live} AND i.size <> 'U'
      GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<{ method: string; revenue: bigint; orders: bigint }[]>`
      SELECT o."paymentMethod"::text AS method, SUM(o."totalCents")::bigint AS revenue, COUNT(*)::bigint AS orders
      FROM "Order" o WHERE ${live} GROUP BY 1 ORDER BY 2 DESC`,
    // Reorder: at/below reorder point, with 30-day demand to size the order.
    db.$queryRaw<{ sku: string; name: string; size: string; stock: number; reorderPoint: number; sold30: bigint }[]>`
      SELECT v.sku, p."nameEs" AS name, v.size, v.stock, v."reorderPoint",
             COALESCE((SELECT SUM(i.qty) FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
                       WHERE i."variantId" = v.id AND o.status NOT IN ('CANCELLED','EXPIRED')
                         AND o."createdAt" >= now() - interval '30 days'), 0)::bigint AS sold30
      FROM "Variant" v JOIN "Product" p ON p.id = v."productId"
      WHERE v.active AND p.status = 'ACTIVE' AND v.stock <= v."reorderPoint"
      ORDER BY v.stock ASC, sold30 DESC LIMIT 50`,
  ]);

  // Fill missing days with zero so the time axis is continuous.
  const series: { day: string; revenue: number; orders: number }[] = [];
  const map = new Map(byDay.map((d) => [d.day, d]));
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' });
  for (let i = days - 1; i >= 0; i--) {
    const day = fmt.format(new Date(Date.now() - i * 86_400_000));
    const d = map.get(day);
    series.push({ day, revenue: Number(d?.revenue ?? 0), orders: Number(d?.orders ?? 0) });
  }

  const revenue = Number(totals[0]?.revenue ?? 0);
  const orders = Number(totals[0]?.orders ?? 0);
  return {
    revenue,
    orders,
    units: Number(totals[0]?.units ?? 0),
    aov: orders ? Math.round(revenue / orders) : 0,
    series,
    best: best.map((b) => ({ ...b, units: Number(b.units), revenue: Number(b.revenue) })),
    byGrade: byGrade.map((g) => ({ label: g.grade, value: Number(g.units) })),
    bySize: bySize.map((s) => ({ label: s.size, value: Number(s.units) })),
    byMethod: byMethod.map((m) => ({ label: m.method, value: Number(m.revenue), orders: Number(m.orders) })),
    reorder: reorder.map((r) => {
      const sold30 = Number(r.sold30);
      // Cover a month of demand plus the safety stock, at least 2× the reorder point.
      const suggested = Math.max(r.reorderPoint * 2 - r.stock, sold30 + r.reorderPoint - r.stock, 1);
      return { ...r, sold30, suggested };
    }),
  };
}
