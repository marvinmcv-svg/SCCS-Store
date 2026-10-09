# SCCS Store: Brand & Scope (Phase 0)

> Status: draft for review · Source: https://sccs.edu.bo (read 2026-10-09)
> Everything marked **⚠ PLACEHOLDER** will live in `/config/school.ts` so it's a one-line change.


> **Revision (Phase 1, per owner feedback):** design direction changed to **On (on.com)-style**:
> one neutral grotesk (**Geist**, variable) for display + UI, **Geist Mono** for small uppercase labels
> (eyebrows, badges, SKUs, order codes); medium-weight headlines with tight tracking (no condensed type);
> crisp 2–4 px corners on product imagery, pill buttons, generous whitespace. Archivo / Libre Franklin
> are no longer used. Colors, voice and scope below are unchanged. The owner confirmed real photography,
> the official logo and the real bank QR will be supplied later (placeholders are in place).

---

## 1. What the school website tells us

| Item | Finding | Source |
|---|---|---|
| Official name | **Santa Cruz Cooperative School (SCCS)** | Site title, footer |
| Founded | April 10, 1959 (Gulf Oil + Bolivian families); cooperative since 1970 | School profile |
| Type | Private, coeducational, American overseas day school; English instruction; US + Bolivian diplomas | School profile |
| Divisions | **Elementary (Pre-K–5)**, **Middle School**, **High School** (PK–12). The site uses ES / MS / HS everywhere. | Nav, academic programs |
| Enrollment | 697 students | School profile 25-26 |
| Mascot / community name | **Jaguars** ("the Jaguar community", Instagram `@sccsjaguars`) | Home, profile |
| Core values | Respect, Kindness, Integrity, Responsibility, Resilience, Collaboration | School profile |
| Mission line | "The Jaguar community supports, inspires and challenges every mind and heart to reach their full potential." | Home |
| Address | Barrio Las Palmas, Calle Barcelona #1, Santa Cruz de la Sierra, Bolivia | Footer, contact |
| Phone | (+591) 3 3530808 | Footer |
| Email | contactus@sccs.edu.bo | Footer |
| Instagram | @sccsjaguars | Home |
| Logo | Navy shield with "S C C S" and US + Bolivian flags, wordmark "SANTA CRUZ / COOPERATIVE SCHOOL" in navy caps. Only raster (300×79 PNG, 400×400 JPG) is public. Copies in `docs/brand/reference/`. | Header |
| Website font | **Libre Franklin** (Google Fonts, variable 100–900) | Theme CSS |
| Language of site | English (some Spanish pages). Families are 85% Bolivian, so Spanish default in the store makes sense. | Profile |

### Uniform policy (found on "Supplies and Book list")

Published bilingually under the Kindergarten and 1st grade lists:

- **Daily:** white polo, collar, 3–4 buttons, no design except the **school logo** · **khaki bermudas or pants**, no embroidery · **"NO OVERALLS OR SKIRTS"** · flat tennis shoes (no sandals, flip-flops or Crocs).
- **Cold weather:** **red sweater or red jacket**.
- **P.E.:** plain **white T-shirt**, **red or "jaguar" shorts**, sneakers, or a **red or "jaguar" sweat suit** in cold weather.
- Mark all belongings with the student's name.

This changes the product mix in the brief (see Q1 below). We found no published policy for MS/HS, and no existing school store or price list.

---

## 2. Brand tokens (derived)

### Color

The site's theme uses three brand hues. The uniform itself is **white + khaki + red**, so red matters on product pages.

| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| `brand.navy` (primary / **accent**) | `#292963` | `#B4B4F0` (text on it `#14143A`) | Primary CTA, selected states, links. **The only accent.** | 13.2:1 on white · 9.7:1 on #111 |
| `brand.red` | `#B72034` | `#F06372` | Jaguar red: sale/low-stock text, destructive actions, red garments | 6.4:1 on white · 6.1:1 on #111 |
| `brand.gold` | `#F8A724` | `#F8A724` | Small fills only ("Nuevo" badge, QR frame highlight). **Never text on white** (2.0:1). Navy text on gold = 6.6:1 | — |
| `bg` | `#FFFFFF` | `#000000` | App background | |
| `surface.product` | `#F5F5F5` | `#111111` | Product image backdrop, cards | |
| `text.primary` | `#111111` | `#FFFFFF` | | 18.9:1 |
| `text.secondary` | `#6B6B6B` | `#A0A0A0` | Meta, captions | 4.9:1 / 7.2:1 |
| `border.subtle` | `#E8E8E8` | `#262626` | Hairlines only where needed | |
| `success` | `#1F7A3E` | `#4ADE80` | Payment verified, ready for pickup | |

Rule: navy is the accent. Red and gold are brand colors, not extra accents, and appear on badges and product art, never as competing CTAs.

### Typography (2 variable families)

| Role | Family | Why |
|---|---|---|
| Display | **Archivo** (variable: `wght` 100–900, `wdth` 62–125) set at `wdth 62–75`, `wght 800–900`, tight tracking, uppercase for heroes | Condensed heavy grotesque, giving that editorial sports-app energy without Nike's font. One file covers condensed and regular widths. |
| Body / UI | **Libre Franklin** (variable 100–900) | The school's own web font: brand continuity, very readable, has tabular figures (`font-variant-numeric: tabular-nums`) for prices. |

Fluid scale (clamp, 390→1440): `display-xl 40→88`, `display-l 32→56`, `title 22→28`, `body 16`, `caption 13`, `micro 11`. At most 3 sizes per section.

### Other tokens (Phase 1)
- Spacing: 4pt grid (4, 8, 12, 16, 20, 24, 32, 40, 56, 72).
- Radius: `sm 8` · `card 16` · `sheet 24` · `pill 9999` (all buttons).
- Elevation: 2 levels, very soft (`0 1px 2px / 4%`, `0 8px 24px / 8%`), mostly used for sheets and drawers.
- Motion: `fast 200ms`, `base 250ms`, `slow 350ms`; easing `cubic-bezier(.2,.8,.2,1)` plus Framer springs (`stiffness 400, damping 32`); press `scale .97`; disabled under `prefers-reduced-motion`.

### Voice & tone
The school writes warmly and with pride ("Jaguar community", "lifelong learners"). The store should be **warm, direct and calm, written for parents**: short sentences, no hype, no urgency tricks.
- ES (default, use *usted* with parents): "Agregar para Sofía", "Listo para recoger", "¿Todavía le queda la talla M?"
- EN: "Add for Sofia", "Ready for pickup", "Still fits?"
- Recurring motif: **"Jaguar"** (e.g. hero "Vuelta a clases, Jaguars", empty bag "Tu bolsa está lista para llenarse").

### Logo usage
- Use the official raster logo in the header for now. **We need a vector (SVG) logo from the school** (Q4). Until then, the app icon and favicon use a simplified, clearly temporary "SCCS" monogram tile in navy.
- Placeholder product imagery: generated SVG/PNG garment silhouettes in true uniform colors (white polo with a navy crest dot, khaki, red, white PE tee) on `#F5F5F5`, never anything resembling real photography. Swap process documented in Phase 3.

---

## 3. Scope decisions & assumptions (I'll proceed on these unless told otherwise)

1. **Grade structure** follows the school's terms, not the brief's: `Pre-K & Kínder` · `Primaria (1°–5°)` · `Middle School (6°–8°)` · `High School (9°–12°)`. "Shop by Grade" chips: **Inicial · Primaria · Secundaria (MS/HS)**. The data model stores the exact grade (PK, K, 1–12) so filters can be as granular as needed. *Assumes ES = PK–5, MS = 6–8, HS = 9–12, the standard US split; the site doesn't say exactly.*
2. **Catalog matches the real policy:** logo polo, khaki bermuda, khaki pants, red sweater, red jacket, PE white tee, red PE shorts, red sweat suit. Plus bags, lunch bag, bottle, cap, notebooks, pencil case (the K list asks for an "SCCS pencil case"!), and Jaguar souvenirs. **No skirts** in seed data unless Q1 says otherwise. Gender/fit becomes `unisex | boys | girls` fit, not a different garment.
3. **Shoes are not sold** (the policy only requires generic tennis shoes).
4. **Stack:** as specified. My picks where the brief left a choice:
   - **Auth.js v5** (Prisma adapter; email+password and magic link) rather than Supabase Auth, so all data stays in one Railway Postgres with no second vendor.
   - **Storage: Railway Buckets (S3-compatible)**, keeping it in the same platform. R2 works too through the same S3 client, configured by env.
   - **Email: Resend** (adapter interface). **WhatsApp:** click-to-chat (`wa.me`) links in v1, with a provider interface ready for the WhatsApp Cloud API.
   - **Tailwind v4 + shadcn/ui**, Framer Motion (`motion`), next-intl, Zod, RHF, Vitest, Playwright, Sentry.
5. **Money:** integer **centavos** in DB; displayed `Bs 120,00` via `Intl.NumberFormat('es-BO', {currency:'BOB'})`. Timezone `America/La_Paz` (UTC−4, no DST).
6. **Pickup location:** "Oficina de Administración, campus SCCS" **⚠ PLACEHOLDER**.
7. **Exchange window:** 15 days from pickup, unused with tags **⚠ PLACEHOLDER**.
8. **Pay-at-school reservation:** expires after 3 school days **⚠ PLACEHOLDER**. Checkout stock hold: 15 min (per brief).
9. **Bundle discount:** 10% default per bundle, editable by admin **⚠ PLACEHOLDER**.
10. **Prices:** realistic seed prices in BOB (e.g. polo Bs 120, sweater Bs 220) **⚠ PLACEHOLDER**, clearly flagged in the admin UI as seed data.
11. **Privacy (minors):** student = first name + grade + section + fit + sizes only. No photos, no birthdates (age for the sizing helper is entered ad hoc and never stored), no analytics on student-facing data. Analytics: cookieless (Plausible-style) and aggregate only.
12. **Students as users:** v1 students browse and favorite without accounts, or use a parent's device. "Student request → parent approves" is deferred (needs student accounts, which raises minor-privacy questions). Profiles are parent-controlled only.

### Proposed `/config/school.ts` shape
```ts
export const school = {
  name: 'Santa Cruz Cooperative School', shortName: 'SCCS', storeName: 'SCCS Store',
  mascot: 'Jaguars',
  address: 'Barrio Las Palmas, Calle Barcelona #1, Santa Cruz de la Sierra, Bolivia',
  phone: '+591 3 3530808', email: 'contactus@sccs.edu.bo', instagram: 'sccsjaguars',
  storeEmail: 'tienda@sccs.edu.bo',            // ⚠ PLACEHOLDER
  whatsapp: '+591 70000000',                   // ⚠ PLACEHOLDER
  pickupLocation: { es: 'Oficina de Administración', en: 'Administration Office' }, // ⚠
  divisions: [/* PK–K, 1–5, 6–8, 9–12 */],
  bank: { bank: '⚠', holder: '⚠', account: '⚠', nit: '⚠' },
  qrImage: '/placeholder/qr-bancario.svg',     // ⚠ PLACEHOLDER
  policy: { exchangeDays: 15, payAtSchoolHoldDays: 3, checkoutHoldMinutes: 15 }, // ⚠
  locale: { default: 'es', supported: ['es','en'], currency: 'BOB', timeZone: 'America/La_Paz' },
} as const;
```

---

## 4. Open questions

### Blocking-ish (they change data or design; I'll use the defaults above if you don't answer)
1. **Uniform truth.** The site's policy (white logo polo, khaki bermuda/pants, red sweater/jacket, PE white tee + red shorts, **no skirts**) is published under ES lists. Does it apply to MS/HS too? Does the school actually *sell* khakis, or only logo items (polo, sweater, jacket, PE)? Is a "jaguar print" short or sweat suit a real item?
2. **Logo & approval.** Is this store sanctioned by SCCS administration, so we can use the official logo? Can you get a **vector (SVG/AI)** version?
3. **Payments.** Which bank(s) issue the school's QR? Should a single static QR be shown, or per-order dynamic QRs (some Bolivian banks offer an API)? Does the school need **factura (SIAT) / NIT capture** at checkout? That would add a NIT + razón social field to checkout.

### Non-blocking (can be answered any time before Phase 4–6)
4. Real store contact: WhatsApp business number, store email, pickup office and hours.
5. Pickup cadence: fixed weekly windows (e.g. Tue/Thu 7:30–8:30 & 14:30–15:30) or ad hoc?
6. Exchange policy: window length and conditions.
7. Sections naming (A/B/C? homeroom teacher name?).
8. Do souvenirs/notebooks come from the school or the Mother's Club? (This affects who manages that catalog; it could become a role.)
9. Domain: `tienda.sccs.edu.bo`?

---

## 5. Phase plan recap
| Phase | Deliverable |
|---|---|
| 0 ✅ | This document + reference assets |
| 1 | Next.js scaffold, tokens (light/dark), fonts, core UI components, `/design` showcase |
| 2 | Prisma schema, seed (~25 products, 4 bundles, 3 slots, users), Auth.js + roles, next-intl |
| 3 | Home, Shop, PDP, Search, Favorites |
| 4 | Bag, student profiles, bundles, checkout, payment proofs, tracking, pickup QR |
| 5 | Admin dashboard |
| 6 | Notifications (email + WhatsApp), exchanges, reports |
| 7 | PWA, perf, a11y, E2E, Railway deploy, README |
