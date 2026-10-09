'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { requireRole } from '@/lib/session';
import { audit } from '@/lib/audit';
import { revalidateCatalog } from '@/lib/revalidate';
import { processImageUpload, deleteStoredImage } from '@/lib/images';
import { slugify } from '@/lib/utils';
import { sizeSort, GRADES, GARMENT_TYPES } from '@/config/catalog';
import { notifyBackInStock } from '@/lib/notify';

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(40).regex(/^[A-Z0-9._-]+$/i),
  size: z.string().trim().min(1).max(10),
  color: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-f]{6}$/i),
  priceCents: z.number().int().min(0).max(10_000_000),
  compareAtCents: z.number().int().min(0).nullable(),
  reorderPoint: z.number().int().min(0).max(10_000),
  active: z.boolean(),
  initialStock: z.number().int().min(0).max(100_000).optional(),
});

const productSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().max(80).optional(),
  nameEs: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descEs: z.string().max(4000),
  descEn: z.string().max(4000),
  careEs: z.string().max(2000),
  careEn: z.string().max(2000),
  categoryId: z.string().min(1),
  garmentType: z.enum(GARMENT_TYPES).nullable(),
  grades: z.array(z.enum(GRADES)),
  fit: z.enum(['UNISEX', 'BOYS', 'GIRLS']),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  featured: z.boolean(),
  isNew: z.boolean(),
  isUniform: z.boolean(),
  allowPreorder: z.boolean(),
  preorderDate: z.string().nullable(),
  tags: z.array(z.string().trim().max(30)).max(20),
  variants: z.array(variantSchema).min(1),
});
export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(input: ProductInput) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const d = productSchema.parse(input);
    const slug = slugify(d.slug || d.nameEs);
    const clash = await db.product.findFirst({ where: { slug, NOT: d.id ? { id: d.id } : undefined } });
    if (clash) throw new ActionError('INVALID', { slug: 'taken' });
    const skus = d.variants.map((v) => v.sku.toUpperCase());
    if (new Set(skus).size !== skus.length) throw new ActionError('INVALID', { variants: 'duplicate sku' });
    const skuClash = await db.variant.findFirst({ where: { sku: { in: skus }, NOT: d.id ? { productId: d.id } : undefined } });
    if (skuClash) throw new ActionError('INVALID', { variants: `sku ${skuClash.sku} taken` });

    const data = {
      slug,
      nameEs: d.nameEs,
      nameEn: d.nameEn,
      descEs: d.descEs,
      descEn: d.descEn,
      careEs: d.careEs,
      careEn: d.careEn,
      categoryId: d.categoryId,
      garmentType: d.garmentType,
      grades: d.grades,
      fit: d.fit,
      status: d.status,
      featured: d.featured,
      isNew: d.isNew,
      isUniform: d.isUniform,
      allowPreorder: d.allowPreorder,
      preorderDate: d.preorderDate ? new Date(`${d.preorderDate}T12:00:00-04:00`) : null,
      tags: d.tags.filter(Boolean),
    };

    const product = await db.$transaction(async (tx) => {
      const p = d.id ? await tx.product.update({ where: { id: d.id }, data }) : await tx.product.create({ data });
      const existing = await tx.variant.findMany({ where: { productId: p.id } });
      const keep = new Set<string>();
      for (const v of d.variants) {
        const vData = {
          sku: v.sku.toUpperCase(),
          size: v.size,
          sizeSort: sizeSort(v.size),
          color: v.color,
          colorHex: v.colorHex,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents,
          reorderPoint: v.reorderPoint,
          active: v.active,
        };
        if (v.id && existing.some((e) => e.id === v.id)) {
          keep.add(v.id);
          await tx.variant.update({ where: { id: v.id }, data: vData });
        } else {
          const created = await tx.variant.create({ data: { ...vData, productId: p.id, stock: v.initialStock ?? 0 } });
          keep.add(created.id);
          if (v.initialStock) await tx.stockMovement.create({ data: { variantId: created.id, delta: v.initialStock, stockAfter: v.initialStock, reason: 'IMPORT', note: 'initial', actorId: user.id } });
        }
      }
      // Removed rows are deactivated (they may be referenced by past orders).
      await tx.variant.updateMany({ where: { productId: p.id, id: { notIn: [...keep] } }, data: { active: false } });
      return p;
    });
    await audit(user.id, d.id ? 'product.update' : 'product.create', 'Product', product.id, { slug, status: d.status });
    revalidateCatalog();
    revalidatePath('/[locale]/admin/products', 'layout');
    return { id: product.id };
  });
}

export async function archiveProduct(id: string) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    await db.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
    await audit(user.id, 'product.archive', 'Product', id);
    revalidateCatalog();
    return null;
  });
}

export async function uploadProductImages(productId: string, formData: FormData) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const product = await db.product.findUnique({ where: { id: productId }, include: { images: true } });
    if (!product) throw new ActionError('NOT_FOUND');
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length || files.length > 12) throw new ActionError('INVALID');
    let sort = product.images.length;
    for (const f of files) {
      try {
        const img = await processImageUpload(f, `products/${productId}`);
        await db.productImage.create({ data: { productId, url: img.url, blur: img.blur, sort: sort++, alt: product.nameEs } });
      } catch (e) {
        throw new ActionError(e instanceof Error && ['FILE_SIZE', 'FILE_TYPE'].includes(e.message) ? e.message : 'UNKNOWN');
      }
    }
    await audit(user.id, 'product.images.upload', 'Product', productId, { count: files.length });
    revalidateCatalog();
    return db.productImage.findMany({ where: { productId }, orderBy: { sort: 'asc' } });
  });
}

export async function reorderProductImages(productId: string, ids: string[]) {
  return run(async () => {
    await requireRole('ADMIN');
    await db.$transaction(ids.map((id, i) => db.productImage.updateMany({ where: { id, productId }, data: { sort: i } })));
    revalidateCatalog();
    return null;
  });
}

export async function deleteProductImage(imageId: string) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const img = await db.productImage.delete({ where: { id: imageId } });
    await deleteStoredImage(img.url);
    await audit(user.id, 'product.images.delete', 'Product', img.productId);
    revalidateCatalog();
    return null;
  });
}

// ─── Bundles ────────────────────────────────────────────────────────────────

const bundleSchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().max(80).optional(),
  nameEs: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  descEs: z.string().max(2000),
  descEn: z.string().max(2000),
  grades: z.array(z.enum(GRADES)),
  fit: z.enum(['UNISEX', 'BOYS', 'GIRLS']),
  discountPct: z.number().int().min(0).max(60),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(10), optional: z.boolean() })).min(1),
});
export type BundleInput = z.input<typeof bundleSchema>;

export async function saveBundle(input: BundleInput) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const d = bundleSchema.parse(input);
    const slug = slugify(d.slug || d.nameEs);
    const clash = await db.bundle.findFirst({ where: { slug, NOT: d.id ? { id: d.id } : undefined } });
    if (clash) throw new ActionError('INVALID', { slug: 'taken' });
    const data = { slug, nameEs: d.nameEs, nameEn: d.nameEn, descEs: d.descEs, descEn: d.descEn, grades: d.grades, fit: d.fit, discountPct: d.discountPct, status: d.status };
    const bundle = await db.$transaction(async (tx) => {
      const b = d.id ? await tx.bundle.update({ where: { id: d.id }, data }) : await tx.bundle.create({ data });
      await tx.bundleItem.deleteMany({ where: { bundleId: b.id } });
      await tx.bundleItem.createMany({ data: d.items.map((i, k) => ({ bundleId: b.id, productId: i.productId, qty: i.qty, optional: i.optional, sort: k })) });
      return b;
    });
    await audit(user.id, d.id ? 'bundle.update' : 'bundle.create', 'Bundle', bundle.id, { slug });
    revalidateCatalog();
    return { id: bundle.id };
  });
}

export async function uploadBundleImage(bundleId: string, formData: FormData) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const file = formData.get('file');
    if (!(file instanceof File)) throw new ActionError('INVALID');
    const img = await processImageUpload(file, `bundles/${bundleId}`).catch((e: Error) => {
      throw new ActionError(['FILE_SIZE', 'FILE_TYPE'].includes(e.message) ? e.message : 'UNKNOWN');
    });
    const old = await db.bundle.findUnique({ where: { id: bundleId } });
    await db.bundle.update({ where: { id: bundleId }, data: { image: img.url, imageBlur: img.blur } });
    if (old?.image) await deleteStoredImage(old.image);
    await audit(user.id, 'bundle.image', 'Bundle', bundleId);
    revalidateCatalog();
    return { url: img.url };
  });
}

// ─── Inventory ──────────────────────────────────────────────────────────────

const adjustSchema = z.object({
  variantId: z.string(),
  delta: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0),
  reason: z.enum(['PURCHASE', 'ADJUSTMENT', 'RETURN', 'EXCHANGE', 'DAMAGE']),
  note: z.string().trim().max(200).optional(),
});

/** Stock adjustment with audit trail; never lets stock go negative. */
export async function adjustStock(input: z.input<typeof adjustSchema>) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const d = adjustSchema.parse(input);
    const v = await db.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ stock: number; productId: string }[]>`SELECT stock, "productId" FROM "Variant" WHERE id = ${d.variantId} FOR UPDATE`;
      if (!row) throw new ActionError('NOT_FOUND');
      if (row.stock + d.delta < 0) throw new ActionError('INVALID', { delta: 'negative' });
      const updated = await tx.variant.update({ where: { id: d.variantId }, data: { stock: { increment: d.delta } } });
      await tx.stockMovement.create({ data: { variantId: d.variantId, delta: d.delta, stockAfter: updated.stock, reason: d.reason, note: d.note ?? null, actorId: user.id } });
      return { ...updated, before: row.stock };
    });
    await audit(user.id, 'stock.adjust', 'Variant', d.variantId, { delta: d.delta, reason: d.reason, sku: v.sku, after: v.stock });
    if (v.before <= 0 && v.stock > 0) void notifyBackInStock(v.productId, v.id);
    revalidateCatalog();
    return { stock: v.stock };
  });
}

/** CSV import: `sku,stock` sets absolute stock; `sku,delta` adds/subtracts. */
export async function importStockCsv(formData: FormData) {
  return run(async () => {
    const user = await requireRole('ADMIN');
    const { parseCsv } = await import('@/lib/admin');
    const file = formData.get('file');
    if (!(file instanceof File) || file.size > 1_000_000) throw new ActionError('INVALID');
    const rows = parseCsv(await file.text());
    const header = rows.shift()?.map((h) => h.trim().toLowerCase()) ?? [];
    const iSku = header.indexOf('sku');
    const iStock = header.indexOf('stock');
    const iDelta = header.indexOf('delta');
    if (iSku < 0 || (iStock < 0 && iDelta < 0)) throw new ActionError('INVALID', { file: 'header' });
    let ok = 0;
    const errors: string[] = [];
    const restocked: { productId: string; id: string }[] = [];
    for (const [n, r] of rows.entries()) {
      const sku = r[iSku]?.trim().toUpperCase();
      const raw = Number((iStock >= 0 ? r[iStock] : r[iDelta])?.trim());
      if (!sku || !Number.isInteger(raw)) {
        errors.push(`row ${n + 2}`);
        continue;
      }
      try {
        await db.$transaction(async (tx) => {
          const [v] = await tx.$queryRaw<{ id: string; stock: number; productId: string }[]>`SELECT id, stock, "productId" FROM "Variant" WHERE sku = ${sku} FOR UPDATE`;
          if (!v) throw new Error('sku');
          const delta = iStock >= 0 ? raw - v.stock : raw;
          if (v.stock + delta < 0) throw new Error('negative');
          if (delta === 0) return;
          const u = await tx.variant.update({ where: { id: v.id }, data: { stock: { increment: delta } } });
          await tx.stockMovement.create({ data: { variantId: v.id, delta, stockAfter: u.stock, reason: 'IMPORT', note: file.name, actorId: user.id } });
          if (v.stock <= 0 && u.stock > 0) restocked.push({ productId: v.productId, id: v.id });
        });
        ok++;
      } catch {
        errors.push(`row ${n + 2} (${sku})`);
      }
    }
    await audit(user.id, 'stock.import', 'Variant', null, { ok, errors: errors.length, file: file.name });
    for (const r of restocked) void notifyBackInStock(r.productId, r.id);
    revalidateCatalog();
    return { ok, errors };
  });
}
