import 'server-only';
import { db } from '@/lib/db';
import { formatBs } from '@/lib/money';
import { formatDate, formatSlot } from '@/lib/dates';
import { getSettings, pickupLocation } from '@/lib/settings';
import { sendEmail, emailLayout } from './email';
import { sendWhatsApp } from './whatsapp';
import { render, type TemplateId } from './templates';

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export function orderUrl(order: { code: string; pickupToken: string; locale: string }) {
  return `${siteUrl()}${order.locale === 'en' ? '/en' : ''}/orders/${order.code}?t=${order.pickupToken}`;
}

/**
 * Notify a family about an order event on every channel they allow.
 * Never throws: a failed message must not fail a checkout or an admin action.
 */
export async function notifyOrder(orderId: string, template: TemplateId, extra: { reason?: string; status?: string } = {}) {
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { user: true, pickupSlot: true } });
    if (!order) return;
    const settings = await getSettings();
    const locale = order.user?.locale ?? order.locale;
    const vars = {
      name: order.name.split(' ')[0],
      code: order.code,
      total: formatBs(order.totalCents),
      url: orderUrl(order),
      slot: order.pickupSlot ? formatSlot(order.pickupSlot.startsAt, order.pickupSlot.endsAt, locale) : undefined,
      location: pickupLocation(settings.store, locale),
      method: order.paymentMethod,
      expires: order.expiresAt ? formatDate(order.expiresAt, locale) : undefined,
      ...extra,
    };
    const msg = render(template, locale, vars);
    const wantEmail = order.user ? order.user.notifyEmail : true;
    const wantWa = order.user ? order.user.notifyWhatsapp : true;

    if (wantEmail) {
      const r = await sendEmail({
        to: order.email,
        subject: msg.subject,
        html: emailLayout({ title: msg.title, body: msg.body, cta: { label: msg.cta, url: vars.url } }),
        text: `${msg.title}\n\n${msg.body.replace(/<[^>]+>/g, '')}\n\n${vars.url}`,
      });
      await db.notification.create({
        data: { orderId, userId: order.userId, channel: 'EMAIL', to: order.email, template, status: r.ok ? 'SENT' : 'FAILED', error: r.error ?? null },
      });
    }
    if (wantWa && order.phone) {
      const r = await sendWhatsApp(order.phone, msg.whatsapp, { name: template, lang: locale === 'en' ? 'en' : 'es', params: [vars.name, vars.code, vars.url] });
      await db.notification.create({
        data: {
          orderId,
          userId: order.userId,
          channel: 'WHATSAPP',
          to: order.phone,
          template,
          status: r.mode === 'link' ? 'LINK' : r.ok ? 'SENT' : 'FAILED',
          link: 'link' in r ? r.link : null,
          error: 'error' in r ? r.error : null,
        },
      });
    }
    await db.orderEvent.create({ data: { orderId, type: 'notification', note: template } });
  } catch (e) {
    console.error('[notify] failed', template, e);
  }
}

/** Back-in-stock emails for a variant that just got stock. */
export async function notifyBackInStock(productId: string, variantId: string | null) {
  try {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) return;
    const alerts = await db.stockAlert.findMany({
      where: { productId, notifiedAt: null, OR: [{ variantId: null }, ...(variantId ? [{ variantId }] : [])] },
    });
    for (const a of alerts) {
      const name = a.locale === 'en' ? product.nameEn : product.nameEs;
      const url = `${siteUrl()}${a.locale === 'en' ? '/en' : ''}/p/${product.slug}`;
      const msg = render('back_in_stock', a.locale, { name: '', code: '', total: '', url, product: name });
      const r = await sendEmail({ to: a.email, subject: msg.subject, html: emailLayout({ title: msg.title, body: msg.body, cta: { label: msg.cta, url } }), text: `${msg.body}\n${url}` });
      await db.notification.create({ data: { channel: 'EMAIL', to: a.email, template: 'back_in_stock', status: r.ok ? 'SENT' : 'FAILED', error: r.error ?? null } });
      await db.stockAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
    }
  } catch (e) {
    console.error('[notify] back in stock failed', e);
  }
}

/** Heads-up to the store inbox (new order, new receipt). Never throws. */
export async function notifyStaff(subject: string, lines: string[], path: string) {
  try {
    const settings = await getSettings();
    const url = `${siteUrl()}${path}`;
    await sendEmail({
      to: settings.store.storeEmail,
      subject: `[SCCS Store] ${subject}`,
      text: `${lines.join('\n')}\n\n${url}`,
      html: emailLayout({ title: subject, body: lines.join('<br/>'), cta: { label: 'Abrir en el portal', url } }),
    });
  } catch (e) {
    console.error('[notify] staff failed', e);
  }
}
