# SCCS Store

Official online store of **Santa Cruz Cooperative School** (Santa Cruz de la Sierra, Bolivia).
Parents and students buy uniforms, bags and Jaguar souvenirs online and **pick up at school**
(no shipping in v1). Spanish by default, English toggle. Prices in bolivianos (Bs), es-BO.

Design direction: On (on.com)-style restraint — Geist + Geist Mono, neutral surfaces,
crisp product imagery, one accent (SCCS navy). See `docs/brand-and-scope.md`.

## Highlights

- **Storefront**: editorial home, shop with filter/sort sheets, PDP with swipe/zoom gallery,
  size grid with live stock, size guide + sizing helper, instant search, favorites.
- **Signature features**: student profiles with saved sizes ("Add for Sofía" pre-selects her
  size; "Still fits?" after 6 months), grade kits with per-item sizes and bundle discount,
  complete-the-uniform checklist, pre-orders, back-in-stock alerts, pickup slots with
  capacity, pickup QR, exchange requests, reorder in one tap.
- **Payments (Bolivia)**: bank QR (QR bancario) and transfer with receipt upload, or pay at
  school. Manual verification in the admin. Card gateway interface ready (`src/lib/payments`).
- **Admin** (`/admin`): dashboard, orders + receipt verification, QR pickup desk, products
  (images, variants), kits, inventory (audit log, CSV import/export), pickup slots, content,
  exchanges, reports, users & roles, settings (bank details, QR image), audit log.
- **Reliability**: 15-minute checkout stock holds, transactional stock decrement with row
  locks (no overselling, enforced by DB check constraints), idempotent order creation.
- **Help**: Marvin, an AI receptionist (Claude) that answers from live catalog, stock, kits and
  order status; the WhatsApp chat widget (+591 77165787); dark mode and ES/EN switches in the header.
- **WhatsApp**: every new order is sent to the store's WhatsApp with the full summary; families get
  WhatsApp confirmations when their order is received, when their receipt arrives, when payment is
  verified, and at pickup. The order page also has a one-tap "send order to the store" button.
- **Privacy**: students are minors — first name, grade, section, fit and sizes only.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind CSS v4 · Motion · vaul ·
Radix primitives · next-intl · Prisma 6 + PostgreSQL · Auth.js v5 (password + magic link) ·
Zod · React Hook Form · sharp · Vitest · Playwright · optional Sentry.

## Local development

```bash
cp .env.example .env            # set DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)
npm install                     # runs prisma generate
npx prisma migrate dev          # create tables
npm run db:seed                 # demo catalog, kits, slots, users, orders
npm run dev                     # http://localhost:3000  (English at /en)
```

Useful scripts: `npm run lint`, `npm run typecheck`, `npm test` (Vitest),
`npm run images:generate` (placeholder art), `npm run icons:generate` (PWA icons).

### Demo accounts (seed)

| Role | Email | Password |
|---|---|---|
| Owner (everything) | `owner@sccs.edu.bo` | `Sccs2026!` |
| Admin (all but users/roles) | `admin@sccs.edu.bo` | `Sccs2026!` |
| Staff (orders, payments, pickups) | `staff@sccs.edu.bo` | `Sccs2026!` |
| Parent with 2 students | `familia@example.com` | `Sccs2026!` |

**Change these passwords (or disable the demo users in Admin → Users) before going live.**
Promo code for testing: `BIENVENIDO10`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | ✅ | `true` behind Vercel/Railway proxies |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public URL, used in emails/WhatsApp links |
| `STORAGE_DRIVER` | – | `s3` \| `db` \| `local`. Default: S3 if keys set, `db` on Vercel, else local disk |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | – | S3-compatible storage (Railway Buckets, R2, Supabase, AWS) |
| `RESEND_API_KEY`, `EMAIL_FROM` | – | Transactional email. Without a key, emails are logged |
| `ANTHROPIC_API_KEY` | – | Turns on Marvin, the AI receptionist. Without it Marvin replies with a WhatsApp link |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | – | WhatsApp Cloud API: sends order/payment messages automatically. Without them, admins get one-tap click-to-chat links |
| `WHATSAPP_TEMPLATE_MODE` | – | `1` to send Meta-approved templates (needed outside the 24-hour chat window). Template names = ids in `src/lib/notify/templates.ts` plus `store_new_order`, `store_alert` |
| `CRON_SECRET` | – | Protects `/api/cron/expire` (Vercel Cron sends it automatically) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | – | Error monitoring (off unless set) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | – | Cookieless analytics (off unless set) |

## Deployment (current setup)

- **App**: Vercel project `sccs-store-app` (region `iad1`), deploys on every push to the
  production branch. Build = `npm run vercel-build`: `prisma migrate deploy` → seed only if the
  database is empty → `next build`.
- **Database**: Railway project "SCCS Store APP" → PostgreSQL (US East).
- **Files**: stored in Postgres (`StoredFile`) until S3 keys are added; to switch, add the
  Railway bucket's `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` in Vercel and set
  `STORAGE_DRIVER=s3` (existing DB files would need copying).
- **Cron**: `vercel.json` runs `/api/cron/expire` daily to expire unpaid pay-at-school
  reservations (stock holds also self-expire at checkout).

## Replacing placeholders

- **Photos**: Admin → Products → drag photos in (auto-converted to WebP with blur placeholders).
  Shoot on a seamless light-grey background or cut-outs, 4:5 portrait, product centred.
- **Bank QR & account**: Admin → Settings → Payments.
- **WhatsApp, store email, pickup location, exchange window**: Admin → Settings → Store.
- **Official logo**: replace `public/brand/sccs-crest.jpg` and `public/brand/crest.svg`, then
  `npm run icons:generate`.
- School facts and defaults: `src/config/school.ts`.

## Project structure

```
src/app/[locale]/(store)   storefront routes      src/app/[locale]/admin   admin portal
src/actions                server actions          src/lib                  domain logic
src/components/ui          design system           src/components/store     storefront UI
src/config                 school, catalog, sizing src/messages             es/en copy
prisma/                    schema, migrations, seed
```
