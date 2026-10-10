/**
 * Transactional message copy (es/en) for email and WhatsApp.
 * Keep WhatsApp texts short; they may be sent as approved templates via
 * the WhatsApp Business API (see docs/notifications.md).
 */
export type TemplateId =
  | 'order_received'
  | 'payment_received'
  | 'payment_verified'
  | 'payment_rejected'
  | 'order_preparing'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'order_cancelled'
  | 'order_expired'
  | 'exchange_update'
  | 'back_in_stock';

export type TemplateVars = {
  name: string;
  code: string;
  total: string;
  url: string;
  slot?: string;
  location?: string;
  reason?: string;
  product?: string;
  status?: string;
  method?: string;
  expires?: string;
};

type Out = { subject: string; title: string; body: string; cta: string; whatsapp: string };

export function render(id: TemplateId, locale: string, v: TemplateVars): Out {
  const es = locale !== 'en';
  const hi = es ? `Hola ${v.name},` : `Hi ${v.name},`;
  switch (id) {
    case 'order_received':
      return es
        ? {
            subject: `Recibimos su pedido ${v.code}`,
            title: '¡Gracias por su pedido!',
            body: `${hi} recibimos su pedido <b>${v.code}</b> por <b>${v.total}</b>. ${v.method === 'CASH' ? `Lo reservamos hasta el ${v.expires}; pague al recoger en ${v.location}.` : 'Pague con el QR del enlace y envíenos el comprobante por WhatsApp.'}`,
            cta: 'Ver mi pedido',
            whatsapp: `SCCS Store: recibimos su pedido ${v.code} (${v.total}). Pague con el QR y envíenos el comprobante por este chat: ${v.url}`,
          }
        : {
            subject: `We received your order ${v.code}`,
            title: 'Thank you for your order!',
            body: `${hi} we received order <b>${v.code}</b> for <b>${v.total}</b>. ${v.method === 'CASH' ? `It's held until ${v.expires}; pay at pickup at the ${v.location}.` : 'Pay with the QR from the link and send us the receipt on WhatsApp.'}`,
            cta: 'View my order',
            whatsapp: `SCCS Store: we received your order ${v.code} (${v.total}). Pay with the QR and send the receipt in this chat: ${v.url}`,
          };
    case 'payment_received':
      return es
        ? { subject: `Recibimos su pago · ${v.code}`, title: 'Recibimos su comprobante de pago', body: `${hi} recibimos el comprobante de pago de su pedido <b>${v.code}</b> por <b>${v.total}</b>. Lo verificaremos en horario escolar y le confirmaremos por WhatsApp.`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: recibimos su comprobante de pago del pedido ${v.code} (${v.total}). Lo verificamos y le confirmamos en breve. ${v.url}` }
        : { subject: `Payment received · ${v.code}`, title: 'We received your payment receipt', body: `${hi} we received the payment receipt for order <b>${v.code}</b> (<b>${v.total}</b>). We'll verify it during school hours and confirm on WhatsApp.`, cta: 'View my order', whatsapp: `SCCS Store: we received your payment receipt for order ${v.code} (${v.total}). We'll verify it and confirm shortly. ${v.url}` };
    case 'payment_verified':
      return es
        ? { subject: `Pago verificado · ${v.code}`, title: 'Pago verificado', body: `${hi} confirmamos el pago de su pedido <b>${v.code}</b>. Le avisaremos cuando esté listo para recoger.`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: confirmamos el pago de su pedido ${v.code}. Le avisaremos cuando esté listo. ${v.url}` }
        : { subject: `Payment verified · ${v.code}`, title: 'Payment verified', body: `${hi} we confirmed payment for order <b>${v.code}</b>. We'll let you know when it's ready for pickup.`, cta: 'View my order', whatsapp: `SCCS Store: payment for order ${v.code} confirmed. We'll tell you when it's ready. ${v.url}` };
    case 'payment_rejected':
      return es
        ? { subject: `Revise su comprobante · ${v.code}`, title: 'No pudimos verificar su pago', body: `${hi} su comprobante para el pedido <b>${v.code}</b> fue rechazado${v.reason ? `: ${v.reason}` : ''}. Suba uno nuevo desde el enlace.`, cta: 'Subir comprobante', whatsapp: `SCCS Store: no pudimos verificar el pago del pedido ${v.code}${v.reason ? ` (${v.reason})` : ''}. Suba un nuevo comprobante: ${v.url}` }
        : { subject: `Please check your receipt · ${v.code}`, title: "We couldn't verify your payment", body: `${hi} your receipt for order <b>${v.code}</b> was rejected${v.reason ? `: ${v.reason}` : ''}. Please upload a new one.`, cta: 'Upload receipt', whatsapp: `SCCS Store: we couldn't verify payment for order ${v.code}${v.reason ? ` (${v.reason})` : ''}. Upload a new receipt: ${v.url}` };
    case 'order_preparing':
      return es
        ? { subject: `Preparando su pedido ${v.code}`, title: 'Estamos preparando su pedido', body: `${hi} estamos alistando las prendas del pedido <b>${v.code}</b>.`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: estamos preparando su pedido ${v.code}. ${v.url}` }
        : { subject: `Preparing your order ${v.code}`, title: "We're preparing your order", body: `${hi} we're getting order <b>${v.code}</b> ready.`, cta: 'View my order', whatsapp: `SCCS Store: we're preparing your order ${v.code}. ${v.url}` };
    case 'ready_for_pickup':
      return es
        ? { subject: `Listo para recoger · ${v.code}`, title: '¡Su pedido está listo!', body: `${hi} su pedido <b>${v.code}</b> está listo para recoger en ${v.location}${v.slot ? `, ${v.slot}` : ''}. Presente el código QR del enlace.`, cta: 'Ver código QR', whatsapp: `SCCS Store: ¡su pedido ${v.code} está listo! Recójalo en ${v.location}${v.slot ? ` (${v.slot})` : ''} y muestre su QR: ${v.url}` }
        : { subject: `Ready for pickup · ${v.code}`, title: 'Your order is ready!', body: `${hi} order <b>${v.code}</b> is ready at the ${v.location}${v.slot ? `, ${v.slot}` : ''}. Show the QR code from the link.`, cta: 'Show QR code', whatsapp: `SCCS Store: your order ${v.code} is ready! Collect it at the ${v.location}${v.slot ? ` (${v.slot})` : ''} and show your QR: ${v.url}` };
    case 'picked_up':
      if (v.method === 'CASH')
        return es
          ? { subject: `Pago recibido y pedido entregado · ${v.code}`, title: 'Pago recibido · pedido entregado', body: `${hi} recibimos su pago de <b>${v.total}</b> y entregamos su pedido <b>${v.code}</b>. ¡Gracias por comprar en SCCS Store!`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: confirmamos su pago de ${v.total} y entregamos su pedido ${v.code}. ¡Gracias!` }
          : { subject: `Payment received, order collected · ${v.code}`, title: 'Payment received · order collected', body: `${hi} we received your payment of <b>${v.total}</b> and order <b>${v.code}</b> has been collected. Thank you for shopping at SCCS Store!`, cta: 'View my order', whatsapp: `SCCS Store: payment of ${v.total} confirmed and order ${v.code} collected. Thank you!` };
      return es
        ? { subject: `Pedido entregado · ${v.code}`, title: 'Pedido entregado', body: `${hi} entregamos su pedido <b>${v.code}</b>. ¡Gracias por comprar en SCCS Store!`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: entregamos su pedido ${v.code}. ¡Gracias!` }
        : { subject: `Order collected · ${v.code}`, title: 'Order collected', body: `${hi} order <b>${v.code}</b> has been collected. Thank you for shopping at SCCS Store!`, cta: 'View my order', whatsapp: `SCCS Store: order ${v.code} collected. Thank you!` };
    case 'order_cancelled':
    case 'order_expired':
      return es
        ? { subject: `Pedido ${id === 'order_expired' ? 'vencido' : 'cancelado'} · ${v.code}`, title: id === 'order_expired' ? 'Su reserva venció' : 'Pedido cancelado', body: `${hi} su pedido <b>${v.code}</b> ${id === 'order_expired' ? 'venció porque no recibimos el pago a tiempo' : 'fue cancelado'}${v.reason ? `: ${v.reason}` : ''}.`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: su pedido ${v.code} ${id === 'order_expired' ? 'venció' : 'fue cancelado'}. ${v.url}` }
        : { subject: `Order ${id === 'order_expired' ? 'expired' : 'cancelled'} · ${v.code}`, title: id === 'order_expired' ? 'Your reservation expired' : 'Order cancelled', body: `${hi} order <b>${v.code}</b> ${id === 'order_expired' ? "expired because payment wasn't received in time" : 'was cancelled'}${v.reason ? `: ${v.reason}` : ''}.`, cta: 'View my order', whatsapp: `SCCS Store: order ${v.code} ${id === 'order_expired' ? 'expired' : 'was cancelled'}. ${v.url}` };
    case 'exchange_update':
      return es
        ? { subject: `Su solicitud de cambio · ${v.code}`, title: 'Actualización de su cambio', body: `${hi} su solicitud de cambio del pedido <b>${v.code}</b> está: <b>${v.status}</b>.${v.reason ? ` ${v.reason}` : ''}`, cta: 'Ver mi pedido', whatsapp: `SCCS Store: su solicitud de cambio del pedido ${v.code}: ${v.status}. ${v.url}` }
        : { subject: `Your exchange request · ${v.code}`, title: 'Exchange update', body: `${hi} your exchange request for order <b>${v.code}</b> is: <b>${v.status}</b>.${v.reason ? ` ${v.reason}` : ''}`, cta: 'View my order', whatsapp: `SCCS Store: your exchange request for order ${v.code}: ${v.status}. ${v.url}` };
    case 'back_in_stock':
      return es
        ? { subject: `¡Volvió! ${v.product}`, title: 'Volvió a estar disponible', body: `${v.product} ya está disponible en SCCS Store.`, cta: 'Comprar ahora', whatsapp: `SCCS Store: ${v.product} volvió a estar disponible. ${v.url}` }
        : { subject: `Back in stock: ${v.product}`, title: "It's back", body: `${v.product} is available again at SCCS Store.`, cta: 'Shop now', whatsapp: `SCCS Store: ${v.product} is back in stock. ${v.url}` };
  }
}

const METHOD: Record<string, { es: string; en: string }> = {
  QR: { es: 'QR bancario', en: 'Bank QR' },
  TRANSFER: { es: 'Transferencia', en: 'Bank transfer' },
  CASH: { es: 'Pago en el colegio', en: 'Pay at school' },
  CARD: { es: 'Tarjeta', en: 'Card' },
};

/** Plain-text order summary for WhatsApp (store alert and click-to-chat). */
export function orderSummaryText(
  o: { code: string; name: string; phone: string; total: string; paymentMethod: string; slot?: string; items: { qty: number; name: string; size: string; student?: string | null }[]; url?: string },
  locale: string,
) {
  const es = locale !== 'en';
  const lines = [
    es ? `🛍️ Nuevo pedido ${o.code}` : `🛍️ New order ${o.code}`,
    `${es ? 'Cliente' : 'Customer'}: ${o.name} · +591 ${o.phone}`,
    ...o.items.map((i) => `• ${i.qty}× ${i.name} (${i.size})${i.student ? ` – ${i.student}` : ''}`),
    `${es ? 'Total' : 'Total'}: ${o.total}`,
    `${es ? 'Pago' : 'Payment'}: ${METHOD[o.paymentMethod]?.[es ? 'es' : 'en'] ?? o.paymentMethod}`,
  ];
  if (o.slot) lines.push(`${es ? 'Recojo' : 'Pickup'}: ${o.slot}`);
  if (o.url) lines.push(o.url);
  return lines.join('\n');
}
