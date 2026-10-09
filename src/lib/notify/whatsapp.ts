import 'server-only';

/**
 * WhatsApp channel.
 * - With WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID: sends through the
 *   WhatsApp Business Cloud API. (Outside the 24h customer-service window
 *   Meta requires approved templates; set WHATSAPP_TEMPLATE_MODE=1 and
 *   create templates named like our TemplateIds, see docs.)
 * - Otherwise: returns a click-to-chat link (wa.me) that staff can open
 *   from the order screen in one tap. Nothing is sent automatically.
 */
export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('591')) return digits;
  if (/^[67]\d{7}$/.test(digits)) return `591${digits}`;
  return digits;
}

export function clickToChat(phone: string, text: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

export async function sendWhatsApp(phone: string, text: string, template?: { name: string; lang: string; params: string[] }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = normalizePhone(phone);
  if (!token || !phoneId) return { ok: true as const, mode: 'link' as const, link: clickToChat(to, text) };
  const body =
    process.env.WHATSAPP_TEMPLATE_MODE === '1' && template
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: template.name, language: { code: template.lang }, components: [{ type: 'body', parameters: template.params.map((p) => ({ type: 'text', text: p })) }] },
        }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text, preview_url: true } };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false as const, mode: 'api' as const, error: `WA ${res.status}: ${(await res.text()).slice(0, 300)}`, link: clickToChat(to, text) };
    return { ok: true as const, mode: 'api' as const };
  } catch (e) {
    return { ok: false as const, mode: 'api' as const, error: e instanceof Error ? e.message : 'send failed', link: clickToChat(to, text) };
  }
}
