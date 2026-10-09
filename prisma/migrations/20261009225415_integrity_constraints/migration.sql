-- Defence in depth: the app decrements stock and books slots inside
-- transactions with row locks; these constraints make overselling and
-- overbooking impossible even if a code path is wrong.
ALTER TABLE "Variant" ADD CONSTRAINT "variant_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "Variant" ADD CONSTRAINT "variant_price_non_negative" CHECK ("priceCents" >= 0);
ALTER TABLE "PickupSlot" ADD CONSTRAINT "slot_booked_within_capacity" CHECK ("booked" >= 0 AND "booked" <= "capacity");
ALTER TABLE "CartItem" ADD CONSTRAINT "cart_item_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "order_item_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "order_total_non_negative" CHECK ("totalCents" >= 0);
