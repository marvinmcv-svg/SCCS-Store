import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { storage, sniffType, fileUrl } from '@/lib/storage';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Validate (magic bytes), normalise (auto-rotate, ≤1600px, WebP) and store
 * an uploaded image publicly. Returns its URL and a tiny blur placeholder.
 */
export async function processImageUpload(file: File, folder: string) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error('FILE_SIZE');
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffType(buf);
  if (!type || type === 'application/pdf') throw new Error('FILE_TYPE');
  const img = sharp(buf, { failOn: 'error' }).rotate();
  const out = await img.resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const blur = await sharp(out).resize(10).webp({ quality: 40 }).toBuffer();
  const key = `public/${folder}/${randomUUID()}.webp`;
  await storage().put(key, out, 'image/webp');
  return { key, url: fileUrl(key), blur: `data:image/webp;base64,${blur.toString('base64')}` };
}

/** Delete a stored image if the URL points at our storage. */
export async function deleteStoredImage(url: string) {
  const m = url.match(/(public\/[^?#]+)/);
  if (m && (url.startsWith('/api/files/') || (process.env.S3_PUBLIC_URL && url.startsWith(process.env.S3_PUBLIC_URL)))) await storage().delete(m[1]);
}
