/**
 * Idempotent-ish seed: wipes catalog/order data and recreates it.
 *   npm run db:seed
 * Demo accounts (password for all: Sccs2026!):
 *   owner@sccs.edu.bo (OWNER) · admin@sccs.edu.bo (ADMIN)
 *   staff@sccs.edu.bo (STAFF) · familia@example.com (parent, 2 students)
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import manifest from '../public/images/manifest.json';
import { PRODUCTS, CATEGORIES, BUNDLES } from './seed-data';
import { sizeSort } from '../src/config/catalog';

const db = new PrismaClient();
const PASSWORD = 'Sccs2026!';

/** Deterministic pseudo-random stock so screenshots and tests are stable. */
function stockFor(slug: string, size: string) {
  let h = 0;
  for (const c of `${slug}:${size}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 8 + (h % 28);
}

function skuFor(slug: string, size: string) {
  const base = slug
    .split('-')
    .map((p) => p.slice(0, 3))
    .join('')
    .toUpperCase()
    .slice(0, 12);
  return `${base}-${size}`;
}

const token = () => randomBytes(16).toString('base64url');
const day = 86_400_000;

/** The next `n` school days (Mon–Fri) after today, as YYYY-MM-DD in La Paz. */
function nextWeekdays(n: number) {
  const out: string[] = [];
  for (let i = 1; out.length < n; i++) {
    const d = new Date(Date.now() + i * day);
    const dow = new Date(d.toLocaleString('en-US', { timeZone: 'America/La_Paz' })).getDay();
    if (dow !== 0 && dow !== 6) out.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(d));
  }
  return out;
}
const at = (date: string, time: string) => new Date(`${date}T${time}:00-04:00`);

async function wipe() {
  // Order matters for FKs.
  await db.$transaction([
    db.notification.deleteMany(),
    db.exchangeRequest.deleteMany(),
    db.paymentProof.deleteMany(),
    db.orderEvent.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.stockHold.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.favorite.deleteMany(),
    db.stockAlert.deleteMany(),
    db.stockMovement.deleteMany(),
    db.collectionItem.deleteMany(),
    db.collection.deleteMany(),
    db.bundleItem.deleteMany(),
    db.bundle.deleteMany(),
    db.productImage.deleteMany(),
    db.variant.deleteMany(),
    db.product.deleteMany(),
    db.category.deleteMany(),
    db.pickupSlot.deleteMany(),
    db.banner.deleteMany(),
    db.announcement.deleteMany(),
    db.promoCode.deleteMany(),
    db.student.deleteMany(),
    db.auditLog.deleteMany(),
    db.setting.deleteMany(),
  ]);
}

async function main() {
  console.log('Seeding SCCS Store…');
  await wipe();
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ── Users ──
  const upsertUser = (email: string, data: Omit<Prisma.UserCreateInput, 'email'>) =>
    db.user.upsert({ where: { email }, update: data, create: { email, ...data } });
  const owner = await upsertUser('owner@sccs.edu.bo', { name: 'Dirección SCCS', role: 'OWNER', passwordHash: hash, emailVerified: new Date() });
  const admin = await upsertUser('admin@sccs.edu.bo', { name: 'Ana Rojas', role: 'ADMIN', passwordHash: hash, phone: '70011111', emailVerified: new Date() });
  const staff = await upsertUser('staff@sccs.edu.bo', { name: 'Luis Vaca', role: 'STAFF', passwordHash: hash, phone: '70022222', emailVerified: new Date() });
  const parent = await upsertUser('familia@example.com', {
    name: 'Carla Méndez',
    role: 'CUSTOMER',
    passwordHash: hash,
    phone: '76543210',
    emailVerified: new Date(),
  });

  // ── Catalog ──
  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) cats[c.slug] = (await db.category.create({ data: c })).id;

  const products: Record<string, { id: string; variants: { id: string; size: string; priceCents: number; sku: string; stock: number }[] }> = {};
  let sort = 0;
  for (const p of PRODUCTS) {
    const imgs = (manifest.products as Record<string, { url: string; blur: string }[]>)[p.art] ?? [];
    const created = await db.product.create({
      data: {
        slug: p.slug,
        nameEs: p.nameEs,
        nameEn: p.nameEn,
        descEs: p.descEs,
        descEn: p.descEn,
        careEs: p.careEs,
        careEn: p.careEn,
        categoryId: cats[p.category],
        garmentType: p.garmentType ?? null,
        grades: p.grades,
        fit: p.fit ?? 'UNISEX',
        status: 'ACTIVE',
        featured: !!p.featured,
        isNew: !!p.isNew,
        isUniform: !!p.isUniform,
        allowPreorder: !!p.allowPreorder,
        preorderDate: p.preorderInDays ? new Date(Date.now() + p.preorderInDays * day) : null,
        tags: p.tags ?? [],
        sort: sort++,
        images: { create: imgs.map((img, i) => ({ url: img.url, blur: img.blur, sort: i, alt: i === 0 ? p.nameEs : null })) },
        variants: {
          create: p.sizes.map((size) => {
            const stock = p.soldOut?.includes(size) ? 0 : p.low?.includes(size) ? 2 : stockFor(p.slug, size);
            // Adult sizes cost a little more, as is common with uniform suppliers.
            const adult = ['XS', 'S', 'M', 'L', 'XL'].includes(size);
            return {
              sku: skuFor(p.slug, size),
              size,
              sizeSort: sizeSort(size),
              color: p.color.es,
              colorHex: p.color.hex,
              priceCents: (p.price + (adult && p.sizes.length > 3 ? 10 : 0)) * 100,
              compareAtCents: p.compareAt ? (p.compareAt + (adult && p.sizes.length > 3 ? 10 : 0)) * 100 : null,
              stock,
              reorderPoint: p.sizes.length === 1 ? 5 : 4,
            };
          }),
        },
      },
      include: { variants: true },
    });
    products[p.slug] = created;
    await db.stockMovement.createMany({
      data: created.variants.map((v) => ({ variantId: v.id, delta: v.stock, stockAfter: v.stock, reason: 'IMPORT' as const, note: 'Seed inicial', actorId: admin.id })),
    });
  }

  // ── Bundles ──
  const bundleImages = manifest.editorial as Record<string, string>;
  for (const [i, b] of BUNDLES.entries()) {
    await db.bundle.create({
      data: {
        slug: b.slug,
        nameEs: b.nameEs,
        nameEn: b.nameEn,
        descEs: b.descEs,
        descEn: b.descEn,
        grades: b.grades,
        discountPct: b.discountPct,
        image: `/images/bundles/${b.slug}.webp`,
        imageBlur: bundleImages[`bundle-${b.slug}`],
        status: 'ACTIVE',
        sort: i,
        items: { create: b.items.map((it, j) => ({ productId: products[it.slug].id, qty: it.qty, optional: !!it.optional, sort: j })) },
      },
    });
  }

  // ── Collections (home rails) ──
  const coll = async (slug: string, titleEs: string, titleEn: string, slugs: string[], s: number) =>
    db.collection.create({
      data: { slug, titleEs, titleEn, sort: s, items: { create: slugs.map((ps, k) => ({ productId: products[ps].id, sort: k })) } },
    });
  await coll('esenciales', 'Esenciales del uniforme', 'Uniform essentials', ['polo-blanca-manga-corta', 'bermuda-khaki', 'pantalon-khaki', 'chompa-roja-escudo', 'chamarra-roja-cierre', 'polera-deporte-blanca', 'short-deporte-rojo'], 0);

  // ── Content ──
  const ed = manifest.editorial as Record<string, string>;
  await db.banner.createMany({
    data: [
      {
        placement: 'home-hero',
        eyebrowEs: 'Gestión 2026 – 2027',
        eyebrowEn: 'School year 2026 – 2027',
        titleEs: 'Vuelta a clases, Jaguars',
        titleEn: 'Back to school, Jaguars',
        subtitleEs: 'Uniformes oficiales listos para recoger en el colegio.',
        subtitleEn: 'Official uniforms, ready to pick up at school.',
        ctaLabelEs: 'Comprar uniformes',
        ctaLabelEn: 'Shop uniforms',
        href: '/shop/uniforms',
        imageMobile: '/images/hero/back-to-school-portrait.webp',
        imageDesktop: '/images/hero/back-to-school-landscape.webp',
        imageBlur: ed['back-to-school-portrait'],
        sort: 0,
      },
      {
        placement: 'home-editorial',
        eyebrowEs: 'Para el frío',
        eyebrowEn: 'For cold days',
        titleEs: 'Hecho para el día a día',
        titleEn: 'Made for every day',
        subtitleEs: 'Chompas y chamarras rojas que aguantan el surazo y el recreo.',
        subtitleEn: 'Red sweaters and jackets built for cold fronts and recess.',
        ctaLabelEs: 'Descubrir',
        ctaLabelEn: 'Discover',
        href: '/p/chamarra-roja-cierre',
        imageMobile: '/images/hero/everyday-portrait.webp',
        imageDesktop: '/images/hero/everyday-landscape.webp',
        imageBlur: ed['everyday-portrait'],
        sort: 0,
      },
    ],
  });
  await db.announcement.create({
    data: {
      textEs: 'Recojo en el colegio · Kits por nivel con hasta 12% de descuento',
      textEn: 'Pickup at school · Grade kits up to 12% off',
      href: '/bundles',
    },
  });
  await db.promoCode.create({ data: { code: 'BIENVENIDO10', pct: 10, maxUses: 500 } });

  // ── Pickup slots: next three school days ──
  const [d1, d2, d3] = nextWeekdays(3);
  const slots = await Promise.all([
    db.pickupSlot.create({ data: { startsAt: at(d1, '07:15'), endsAt: at(d1, '08:15'), capacity: 20 } }),
    db.pickupSlot.create({ data: { startsAt: at(d2, '13:00'), endsAt: at(d2, '14:00'), capacity: 15 } }),
    db.pickupSlot.create({ data: { startsAt: at(d3, '15:00'), endsAt: at(d3, '16:30'), capacity: 25 } }),
  ]);

  // ── Demo family ──
  const eightMonthsAgo = new Date(Date.now() - 245 * day);
  const sofia = await db.student.create({
    data: {
      parentId: parent.id,
      name: 'Sofía',
      grade: '4',
      section: 'B',
      fit: 'GIRLS',
      sizes: {
        POLO: { size: '8', updatedAt: eightMonthsAgo.toISOString() },
        BERMUDA: { size: '8', updatedAt: eightMonthsAgo.toISOString() },
        PE_TEE: { size: '8', updatedAt: eightMonthsAgo.toISOString() },
      },
    },
  });
  const mateo = await db.student.create({
    data: {
      parentId: parent.id,
      name: 'Mateo',
      grade: 'K',
      section: 'A',
      fit: 'BOYS',
      sizes: { POLO: { size: '6', updatedAt: new Date(Date.now() - 40 * day).toISOString() } },
    },
  });

  // ── Orders ──
  type Line = { slug: string; size: string; qty: number; studentId?: string; studentName?: string; grade?: string };
  let seq = 0;
  async function order(o: {
    lines: Line[];
    status: Prisma.OrderCreateInput['status'];
    paymentMethod: Prisma.OrderCreateInput['paymentMethod'];
    paymentStatus: Prisma.OrderCreateInput['paymentStatus'];
    createdAt: Date;
    user?: typeof parent;
    guest?: { name: string; email: string; phone: string };
    slotId?: string;
    pickedUpAt?: Date;
    proof?: { reference: string; status: 'PENDING' | 'APPROVED' };
    events: { status: Prisma.OrderCreateInput['status']; at: Date; note?: string }[];
  }) {
    const items = o.lines.map((l) => {
      const p = PRODUCTS.find((x) => x.slug === l.slug)!;
      const v = products[l.slug].variants.find((x) => x.size === l.size)!;
      return {
        variantId: v.id,
        productId: products[l.slug].id,
        productName: p.nameEs,
        productSlug: p.slug,
        garmentType: p.garmentType ?? null,
        image: (manifest.products as Record<string, { url: string }[]>)[p.art][0].url,
        sku: v.sku,
        size: v.size,
        color: p.color.es,
        qty: l.qty,
        unitPriceCents: v.priceCents,
        studentId: l.studentId ?? null,
        studentName: l.studentName ?? null,
        studentGrade: l.grade ?? null,
      };
    });
    const subtotal = items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0);
    const who = o.user ? { name: o.user.name!, email: o.user.email, phone: o.user.phone! } : o.guest!;
    seq++;
    return db.order.create({
      data: {
        code: `SC-${['7K2Q9', 'M4X8D', 'P2H6T', 'R9B3W', 'Z5N7C'][seq - 1] ?? token().slice(0, 5).toUpperCase()}`,
        userId: o.user?.id ?? null,
        email: who.email,
        name: who.name,
        phone: who.phone,
        pickupName: who.name,
        pickupPhone: who.phone,
        pickupSlotId: o.slotId ?? null,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        subtotalCents: subtotal,
        totalCents: subtotal,
        idempotencyKey: token(),
        pickupToken: token(),
        createdAt: o.createdAt,
        pickedUpAt: o.pickedUpAt ?? null,
        pickedUpById: o.pickedUpAt ? staff.id : null,
        expiresAt: o.paymentMethod === 'CASH' ? new Date(o.createdAt.getTime() + 3 * day) : null,
        items: { create: items },
        events: { create: o.events.map((e) => ({ status: e.status, type: 'status', note: e.note, createdAt: e.at, actorId: e.status === 'RECEIVED' ? null : staff.id })) },
        proofs: o.proof ? { create: { reference: o.proof.reference, status: o.proof.status, reviewedById: o.proof.status === 'APPROVED' ? admin.id : null, reviewedAt: o.proof.status === 'APPROVED' ? o.createdAt : null } } : undefined,
      },
    });
  }

  // Past order: Sofía's uniform, picked up 8 months ago (drives "Still fits?" + checklist).
  await order({
    user: parent,
    lines: [
      { slug: 'polo-blanca-manga-corta', size: '8', qty: 2, studentId: sofia.id, studentName: 'Sofía', grade: '4' },
      { slug: 'bermuda-khaki', size: '8', qty: 1, studentId: sofia.id, studentName: 'Sofía', grade: '4' },
      { slug: 'polera-deporte-blanca', size: '8', qty: 1, studentId: sofia.id, studentName: 'Sofía', grade: '4' },
    ],
    status: 'PICKED_UP',
    paymentMethod: 'QR',
    paymentStatus: 'VERIFIED',
    createdAt: new Date(eightMonthsAgo.getTime() - 3 * day),
    pickedUpAt: eightMonthsAgo,
    proof: { reference: 'BNB-48213377', status: 'APPROVED' },
    events: [
      { status: 'RECEIVED', at: new Date(eightMonthsAgo.getTime() - 3 * day) },
      { status: 'PAYMENT_VERIFIED', at: new Date(eightMonthsAgo.getTime() - 2.8 * day) },
      { status: 'PREPARING', at: new Date(eightMonthsAgo.getTime() - 2 * day) },
      { status: 'READY', at: new Date(eightMonthsAgo.getTime() - day) },
      { status: 'PICKED_UP', at: eightMonthsAgo },
    ],
  });

  // Current order: Mateo, ready for pickup tomorrow.
  await order({
    user: parent,
    lines: [
      { slug: 'polo-inicial-escudo-bordado', size: '6', qty: 2, studentId: mateo.id, studentName: 'Mateo', grade: 'K' },
      { slug: 'estuche-sccs', size: 'U', qty: 1, studentId: mateo.id, studentName: 'Mateo', grade: 'K' },
    ],
    status: 'READY',
    paymentMethod: 'TRANSFER',
    paymentStatus: 'VERIFIED',
    createdAt: new Date(Date.now() - 2 * day),
    slotId: slots[0].id,
    proof: { reference: 'TRF-99120045', status: 'APPROVED' },
    events: [
      { status: 'RECEIVED', at: new Date(Date.now() - 2 * day) },
      { status: 'PAYMENT_VERIFIED', at: new Date(Date.now() - 1.8 * day) },
      { status: 'PREPARING', at: new Date(Date.now() - 1.2 * day) },
      { status: 'READY', at: new Date(Date.now() - 0.5 * day) },
    ],
  });

  // Guest order awaiting payment verification (admin queue demo).
  await order({
    guest: { name: 'Jorge Suárez', email: 'jorge.suarez@example.com', phone: '71234567' },
    lines: [
      { slug: 'chompa-roja-escudo', size: '12', qty: 1, studentName: 'Valentina', grade: '7' },
      { slug: 'pantalon-khaki', size: '12', qty: 1, studentName: 'Valentina', grade: '7' },
    ],
    status: 'RECEIVED',
    paymentMethod: 'QR',
    paymentStatus: 'SUBMITTED',
    createdAt: new Date(Date.now() - 3 * 3_600_000),
    slotId: slots[1].id,
    proof: { reference: 'BNB-55190021', status: 'PENDING' },
    events: [{ status: 'RECEIVED', at: new Date(Date.now() - 3 * 3_600_000) }],
  });

  // Pay-at-school reservation.
  await order({
    guest: { name: 'Patricia Antelo', email: 'patricia.antelo@example.com', phone: '78889900' },
    lines: [{ slug: 'mochila-sccs', size: 'U', qty: 1 }],
    status: 'RECEIVED',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    createdAt: new Date(Date.now() - 20 * 3_600_000),
    slotId: slots[2].id,
    events: [{ status: 'RECEIVED', at: new Date(Date.now() - 20 * 3_600_000) }],
  });

  await db.pickupSlot.update({ where: { id: slots[0].id }, data: { booked: 1 } });
  await db.pickupSlot.update({ where: { id: slots[1].id }, data: { booked: 1 } });
  await db.pickupSlot.update({ where: { id: slots[2].id }, data: { booked: 1 } });

  await db.auditLog.create({ data: { actorId: owner.id, action: 'seed', entity: 'system', meta: { products: PRODUCTS.length } } });

  console.log(`✓ ${PRODUCTS.length} products, ${BUNDLES.length} bundles, ${slots.length} pickup slots, 4 users, 2 students, 4 orders`);
  console.log(`  Demo password for all accounts: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
