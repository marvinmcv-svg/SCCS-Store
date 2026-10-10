import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { MARVIN_MODEL, marvinSystemPrompt, marvinTools, runMarvinTool } from '@/lib/marvin';

export const maxDuration = 60;

const body = z.object({
  locale: z.enum(['es', 'en']).default('es'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[0].role === 'user' && m[m.length - 1].role === 'user', 'conversation must start and end with the user'),
});

const MAX_TOOL_ROUNDS = 6;

/**
 * POST /api/marvin — streams Marvin's reply as plain text.
 * Without ANTHROPIC_API_KEY it answers with a short offline message that
 * points to WhatsApp, so the widget never breaks.
 */
export async function POST(req: Request) {
  const ip = await clientIp();
  if (!rateLimit(`marvin:${ip}`, 20, 60_000).ok) return new Response('Too many messages, please wait a minute.', { status: 429 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Bad request', { status: 400 });
  const { locale, messages: history } = parsed.data;
  const es = locale !== 'en';

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    const s = await getSettings();
    return new Response(
      es
        ? `Hola, soy Marvin. En este momento no puedo responder en línea, pero el equipo de la tienda le atiende por WhatsApp: https://wa.me/${s.store.whatsapp}`
        : `Hi, I'm Marvin. I can't answer online right now, but the store team will help you on WhatsApp: https://wa.me/${s.store.whatsapp}`,
      { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Marvin-Mode': 'offline' } },
    );
  }

  const client = new Anthropic();
  const system = await marvinSystemPrompt(locale);
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (t: string) => controller.enqueue(encoder.encode(t));
      try {
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const s = client.beta.messages.stream(
            {
              model: MARVIN_MODEL,
              max_tokens: 16000,
              output_config: { effort: 'low' },
              betas: ['server-side-fallback-2026-07-01'],
              fallbacks: 'default',
              system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
              tools: marvinTools,
              messages,
            },
            { signal: req.signal },
          );
          s.on('text', write);
          const message = await s.finalMessage();

          if (message.stop_reason === 'refusal') {
            write(es ? 'Disculpe, no puedo ayudar con eso. ¿Puedo ayudarle con algo de la tienda?' : "Sorry, I can't help with that. Can I help with something from the store?");
            break;
          }
          const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
          if (message.stop_reason !== 'tool_use' || !toolUses.length) break;

          messages.push({ role: 'assistant', content: message.content });
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(
            toolUses.map(async (t) => {
              try {
                return { type: 'tool_result' as const, tool_use_id: t.id, content: await runMarvinTool(t.name, t.input, locale) };
              } catch (e) {
                return { type: 'tool_result' as const, tool_use_id: t.id, is_error: true, content: e instanceof z.ZodError ? 'Invalid input for this tool.' : 'Tool failed.' };
              }
            }),
          );
          messages.push({ role: 'user', content: results });
        }
      } catch (e) {
        if (!req.signal.aborted) {
          console.error('[marvin]', e);
          write(es ? '\n\nTuve un problema para responder. Intente de nuevo en un momento.' : '\n\nI had trouble answering. Please try again in a moment.');
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Marvin-Mode': 'ai' } });
}
