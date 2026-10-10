import 'server-only';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Object storage. Keys starting with `public/` are world-readable
 * (product images, banners, QR); `private/` keys (payment receipts) are
 * only served after an authorization check in /api/files.
 *
 * - S3-compatible (Railway Buckets, Cloudflare R2, Supabase, AWS) when
 *   S3_BUCKET is set.
 * - Postgres (StoredFile table) on Vercel when no S3 keys are set.
 * - Local disk (./.data/uploads) otherwise — development only.
 * Force one with STORAGE_DRIVER=s3|db|local.
 */
export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** Short-lived signed GET URL (S3 only). */
  signedUrl?(key: string, seconds: number): Promise<string>;
  /** Direct public URL when the bucket is public (S3_PUBLIC_URL). */
  publicUrl?(key: string): string | null;
}

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' };

function safeKey(key: string) {
  const norm = path.posix.normalize(key).replace(/^\/+/, '');
  if (norm.startsWith('..') || !/^(public|private)\//.test(norm)) throw new Error('Invalid storage key');
  return norm;
}

class LocalDriver implements StorageDriver {
  root = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR || '.data/uploads');
  async put(key: string, body: Buffer) {
    const file = path.join(this.root, safeKey(key));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  }
  async get(key: string) {
    try {
      const k = safeKey(key);
      const body = await readFile(path.join(this.root, k));
      return { body, contentType: TYPES[path.extname(k).toLowerCase()] ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await unlink(path.join(this.root, safeKey(key))).catch(() => {});
  }
}

class S3Driver implements StorageDriver {
  bucket = process.env.S3_BUCKET!;
  client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined,
    // Railway Buckets / R2 use virtual-host style; MinIO needs path style.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1',
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' }
      : undefined,
  });
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType, CacheControl: key.startsWith('public/') ? 'public, max-age=31536000, immutable' : 'private, no-store' }));
  }
  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) return null;
      return { body: Buffer.from(bytes), contentType: res.ContentType ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) })).catch(() => {});
  }
  async signedUrl(key: string, seconds: number) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }), { expiresIn: seconds });
  }
  publicUrl(key: string) {
    const base = process.env.S3_PUBLIC_URL;
    return base && key.startsWith('public/') ? `${base.replace(/\/$/, '')}/${key}` : null;
  }
}

/**
 * Postgres-backed storage: used on serverless hosts (Vercel) when no S3
 * credentials are configured. Fine for a school store's volume (WebP
 * product photos, ≤5 MB receipts); switch to S3 by adding S3_* keys.
 */
class DbDriver implements StorageDriver {
  async put(key: string, body: Buffer, contentType: string) {
    const { db } = await import('@/lib/db');
    const k = safeKey(key);
    const data = new Uint8Array(body);
    await db.storedFile.upsert({ where: { key: k }, update: { data, contentType, size: body.length }, create: { key: k, data, contentType, size: body.length } });
  }
  async get(key: string) {
    const { db } = await import('@/lib/db');
    const f = await db.storedFile.findUnique({ where: { key: safeKey(key) } });
    return f ? { body: Buffer.from(f.data), contentType: f.contentType } : null;
  }
  async delete(key: string) {
    const { db } = await import('@/lib/db');
    await db.storedFile.deleteMany({ where: { key: safeKey(key) } });
  }
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (!driver) {
    const mode = process.env.STORAGE_DRIVER;
    if (mode === 's3' || (!mode && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)) driver = new S3Driver();
    else if (mode === 'db' || (!mode && process.env.VERCEL)) driver = new DbDriver();
    else driver = new LocalDriver();
  }
  return driver;
}

/** URL the browser uses for a stored file. */
export function fileUrl(key: string) {
  return storage().publicUrl?.(key) ?? `/api/files/${key}`;
}

/** Sniff real content type from magic bytes (never trust the filename or header). */
export function sniffType(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}

export const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
