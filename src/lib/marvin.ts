import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { db } from '@/lib/db';
import { formatBs } from '@/lib/money';
import { formatSlot } from '@/lib/dates';
import { getActiveProducts, getBundles, bundlePricing, matchesQuery } from '@/lib/catalog';
import { getSettings, pickupLocation } from '@/lib/settings';
import { recommendSize } from '@/config/sizing';
import { gradeLabel } from '@/config/catalog';
import { school } from '@/config/school';
import { getPage } from '@/content/pages';

/**
 * Marvin, the store's AI receptionist. Answers from live store data through
 * a small set of read-only tools; never places orders or changes anything.
 */
export const MARVIN_MODEL = 'claude-opus-5-5';

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
const path = (locale: string, p: string) => `${locale === 'en' ? '/en' : ''}${p}`;

export async function marvinSystemPrompt(locale: string) {
  const s = await getSettings();
  const faq = getPage('faq', locale, {
    exchangeDays: s.store.exchangeDays,
    holdDays: s.store.payAtSchoolHoldDays,
    location: pickupLocation(s.store, locale),
    email: s.store.storeEmail,
    phone: school.phone,
    whatsapp: s.store.whatsapp,
    address: school.address,
    hours: locale === 'en' ? school.storeHours.en : school.storeHours.es,
  });
  const qa = faq.blocks.flatMap((b) => b.qa ?? []).map((x) => `- ${x.q} ${x.a}`).join('\n');

  return `You are Marvin, the friendly receptionist of SCCS Store, the official online store of ${school.name} (the Jaguars) in Santa Cruz de la Sierra, Bolivia. You help parents and students with uniforms, PE kits, bags, accessories and souvenirs.

How to answer:
- Reply in the language the visitor writes in (Spanish or English). The site is currently shown in ${locale === 'en' ? 'English' : 'Spanish'}. In Spanish use "usted".
- Be warm and brief: two to four short sentences, or a short list. Plain text only, no markdown headings or tables. You may use **bold** sparingly.
- Use the tools for anything about products, prices, stock, sizes, kits or a specific order. Never invent products, prices, stock or order details.
- Link to pages with relative paths from the tools (for example ${path(locale, '/p/some-slug')}). Prices are in bolivianos, written like "Bs 120".
- You cannot place orders, take payments, change orders or see payment receipts. Point people to the bag/checkout, their order page, or the store's WhatsApp.
- To look up an order you need both the order code (like SC-7K2Q9) and the email used at checkout.
- Students are minors: never ask for a student's full name, photo, or other personal details. Height or age for sizing is fine.
- If you can't help, or the visitor asks for a person, offer WhatsApp: https://wa.me/${s.store.whatsapp} (+${s.store.whatsapp}).
- Stay on topic (the store and the school's uniforms). Politely decline unrelated requests.

Store facts:
- Pickup only, no shipping. Pickup at: ${pickupLocation(s.store, locale)}. Families choose a pickup slot at checkout and show the order QR code.
- Store hours: ${locale === 'en' ? school.storeHours.en : school.storeHours.es}.
- Payment is by bank QR only (no cards, transfers or cash). After confirming the order, the order page shows the store's QR and the amount. The family pays from their banking app, then taps "Send order and receipt on WhatsApp", which opens WhatsApp to the store with the order details, and attaches a screenshot of the receipt. Staff verify it, usually the same school day, and confirm on WhatsApp.
- Grade kits bundle the uniform for a grade with a discount when the whole kit is bought.
- Saved student profiles (in Profile) remember each student's sizes.
- Exchanges: within ${s.store.exchangeDays} days of pickup, unworn with tags, requested from the order page.
- Store email: ${s.store.storeEmail}. School phone: ${school.phone}. Address: ${school.address}.

FAQ:
${qa}`;
}

const searchInput = z.object({ query: z.string().max(80).optional(), grade: z.string().max(4).optional(), category: z.string().max(40).optional() });
const productInput = z.object({ slug: z.string().min(1).max(120) });
const sizeInput = z.object({ heightCm: z.number().positive().max(220).optional(), age: z.number().positive().max(25).optional() });
const orderInput = z.object({ code: z.string().min(4).max(20), email: z.string().email().max(120) });

export const marvinTools: Anthropic.Beta.BetaTool[] = [
  {
    name: 'search_products',
    description:
      'Search the live catalog. Returns up to 8 active products with price range, sizes in stock and page path. Use for any question about what the store sells, prices or availability. All fields optional; with none, returns featured products.',
    eager_input_streaming: true,
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free text in Spanish or English, e.g. "polo", "mochila", "PE shorts".' },
        grade: { type: 'string', description: 'Grade code: PK, K, 1-12.' },
        category: { type: 'string', description: 'Category slug: uniforms, pe, bags, accessories, souvenirs.' },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Full details for one product by slug: description, every size with price and units in stock, pre-order info.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'list_kits',
    description: 'List the grade kits (bundles) with their pieces, grades, discount and price.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'recommend_size',
    description: "Suggest a kids' top size from the student's height in cm (preferred) or age. Mention it's a suggestion and the size guide page exists.",
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: { heightCm: { type: 'number' }, age: { type: 'number' } } },
  },
  {
    name: 'order_status',
    description: 'Look up an order. Requires the order code and the exact email used at checkout; returns nothing if they do not match.',
    eager_input_streaming: true,
    input_schema: { type: 'object', properties: { code: { type: 'string' }, email: { type: 'string' } }, required: ['code', 'email'] },
  },
];

const STATUS: Record<string, string> = {
  RECEIVED: 'received, waiting for payment or verification',
  PAYMENT_VERIFIED: 'payment verified',
  PREPARING: 'being prepared',
  READY: 'ready for pickup',
  PICKED_UP: 'picked up',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired (not paid in time)',
};

/** Runs one tool call. Returns a JSON string, or throws on invalid input. */
export async function runMarvinTool(name: string, input: unknown, locale: string): Promise<string> {
  const name_ = (p: { nameEs: string; nameEn: string }) => (locale === 'en' ? p.nameEn : p.nameEs);
  switch (name) {
    case 'search_products': {
      const d = searchInput.parse(input);
      let list = await getActiveProducts();
      if (d.category) list = list.filter((p) => p.category.slug === d.category);
      if (d.grade) list = list.filter((p) => !p.grades.length || p.grades.includes(d.grade!));
      if (d.query) list = list.filter((p) => matchesQuery(p, d.query!));
      if (!d.query && !d.category && !d.grade) list = list.filter((p) => p.featured);
      return JSON.stringify(
        list.slice(0, 8).map((p) => {
          const prices = p.variants.map((v) => v.priceCents);
          return {
            name: name_(p),
            slug: p.slug,
            path: path(locale, `/p/${p.slug}`),
            category: p.category.slug,
            grades: p.grades.length ? p.grades.map((g) => gradeLabel(g, locale)) : 'all grades',
            price: prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatBs(Math.min(...prices)) : `${formatBs(Math.min(...prices))} – ${formatBs(Math.max(...prices))}`) : null,
            sizesInStock: p.variants.filter((v) => v.stock > 0).map((v) => v.size),
            preorder: p.allowPreorder,
          };
        }),
      );
    }
    case 'get_product': {
      const { slug } = productInput.parse(input);
      const p = await db.product.findFirst({
        where: { slug, status: 'ACTIVE' },
        include: { variants: { where: { active: true }, orderBy: { sizeSort: 'asc' } }, category: true },
      });
      if (!p) return JSON.stringify({ error: 'not found' });
      return JSON.stringify({
        name: name_(p),
        path: path(locale, `/p/${p.slug}`),
        description: locale === 'en' ? p.descEn : p.descEs,
        care: locale === 'en' ? p.careEn : p.careEs,
        grades: p.grades.length ? p.grades.map((g) => gradeLabel(g, locale)) : 'all grades',
        fit: p.fit,
        sizes: p.variants.map((v) => ({ size: v.size, color: v.color, price: formatBs(v.priceCents), inStock: v.stock })),
        preorder: p.allowPreorder ? { allowed: true, expected: p.preorderDate } : { allowed: false },
      });
    }
    case 'list_kits': {
      const kits = await getBundles();
      return JSON.stringify(
        kits.map((b) => {
          const pr = bundlePricing(b);
          return {
            name: name_(b),
            path: path(locale, `/bundles/${b.slug}`),
            grades: b.grades.map((g) => gradeLabel(g, locale)),
            discountPct: b.discountPct,
            price: formatBs(pr.total),
            priceBeforeDiscount: formatBs(pr.subtotal),
            pieces: b.items.map((i) => `${i.qty}× ${name_(i.product)}${i.optional ? ' (optional)' : ''}`),
          };
        }),
      );
    }
    case 'recommend_size': {
      const d = sizeInput.parse(input);
      return JSON.stringify({ size: recommendSize(d), sizeGuide: path(locale, '/info/size-guide') });
    }
    case 'order_status': {
      const d = orderInput.parse(input);
      const raw = d.code.trim().toUpperCase();
      const code = raw.startsWith('SC-') ? raw : `SC-${raw}`;
      const o = await db.order.findUnique({ where: { code }, include: { items: true, pickupSlot: true } });
      if (!o || o.email.toLowerCase() !== d.email.trim().toLowerCase()) return JSON.stringify({ error: 'No order matches that code and email.' });
      return JSON.stringify({
        code: o.code,
        status: STATUS[o.status] ?? o.status,
        payment: { method: o.paymentMethod, status: o.paymentStatus },
        total: formatBs(o.totalCents),
        pickupSlot: o.pickupSlot ? formatSlot(o.pickupSlot.startsAt, o.pickupSlot.endsAt, locale) : null,
        items: o.items.map((i) => `${i.qty}× ${i.productName} (${i.size})`),
        orderPage: `${site()}${path(locale, `/orders/${o.code}?t=${o.pickupToken}`)}`,
      });
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}
