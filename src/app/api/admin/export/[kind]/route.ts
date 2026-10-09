import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, can } from '@/lib/session';
import { toCsv } from '@/lib/csv';
import { audit } from '@/lib/audit';

/** CSV exports: orders (staff+), inventory (admin+). UTF-8 with BOM for Excel. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const sp = new URL(req.url).searchParams;
  let csv = '';
  if (kind === 'orders' && can.manageOrders(user)) {
    const orders = await db.order.findMany({
      where: {
        ...(sp.get('status') ? { status: sp.get('status') as never } : {}),
        ...(sp.get('payment') ? { paymentStatus: sp.get('payment') as never } : {}),
        ...(sp.get('method') ? { paymentMethod: sp.get('method') as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true, pickupSlot: true },
      take: 5000,
    });
    csv = toCsv(
      orders.flatMap((o) =>
        o.items.map((i) => ({
          code: o.code,
          created: o.createdAt.toISOString(),
          status: o.status,
          payment_method: o.paymentMethod,
          payment_status: o.paymentStatus,
          customer: o.name,
          email: o.email,
          phone: o.phone,
          pickup_slot: o.pickupSlot?.startsAt.toISOString() ?? '',
          sku: i.sku,
          product: i.productName,
          size: i.size,
          qty: i.qty,
          unit_bs: (i.unitPriceCents / 100).toFixed(2),
          discount_bs: (i.discountCents / 100).toFixed(2),
          student: i.studentName ?? '',
          grade: i.studentGrade ?? '',
          order_total_bs: (o.totalCents / 100).toFixed(2),
        })),
      ),
    );
  } else if (kind === 'inventory' && can.manageInventory(user)) {
    const variants = await db.variant.findMany({ include: { product: true }, orderBy: [{ product: { sort: 'asc' } }, { sizeSort: 'asc' }] });
    csv = toCsv(
      variants.map((v) => ({ sku: v.sku, product: v.product.nameEs, size: v.size, color: v.color, price_bs: (v.priceCents / 100).toFixed(2), stock: v.stock, reorder_point: v.reorderPoint, active: v.active })),
      ['sku', 'product', 'size', 'color', 'price_bs', 'stock', 'reorder_point', 'active'],
    );
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
  await audit(user.id, `export.${kind}`, 'Export', null);
  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sccs-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
