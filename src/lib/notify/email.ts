import 'server-only';

/**
 * Email transport. Uses Resend's HTTP API when RESEND_API_KEY is set;
 * otherwise logs to the server console (dev) so flows stay testable.
 */
export type EmailMessage = { to: string; subject: string; html: string; text: string };

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string; logged?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'SCCS Store <tienda@sccs.edu.bo>';
  if (!key) {
    console.info(`\n[email:dev] → ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
    return { ok: true, logged: true };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}

/** Minimal branded HTML shell shared by all transactional emails. */
export function emailLayout({ title, body, cta }: { title: string; body: string; cta?: { label: string; url: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#14142b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5c5c6b">SCCS Store</td></tr>
<tr><td style="padding-top:20px;font-size:24px;line-height:1.15;letter-spacing:-.02em;font-weight:600">${title}</td></tr>
<tr><td style="padding-top:12px;font-size:15px;line-height:1.55;color:#3a3a4a">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${cta.url}" style="display:inline-block;background:#292963;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px">${cta.label}</a></td></tr>` : ''}
<tr><td style="padding-top:32px;font-size:12px;color:#8a8a96">Santa Cruz Cooperative School · Barrio Las Palmas, Calle Barcelona #1, Santa Cruz de la Sierra</td></tr>
</table></td></tr></table></body></html>`;
}
