import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getCurrentUser, hasRole } from '@/lib/session';

/**
 * Serves stored files. `public/…` is open (immutable cache);
 * `private/…` (payment receipts) requires staff. With S3 we redirect to a
 * 60-second signed URL instead of proxying bytes.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  const isPrivate = key.startsWith('private/');
  if (!isPrivate && !key.startsWith('public/')) return new NextResponse('Not found', { status: 404 });
  if (isPrivate) {
    const user = await getCurrentUser();
    if (!hasRole(user, 'STAFF')) return new NextResponse('Forbidden', { status: 403 });
  }
  const s = storage();
  if (isPrivate && s.signedUrl) return NextResponse.redirect(await s.signedUrl(key, 60));
  const file = await s.get(key);
  if (!file) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ...(isPrivate ? { 'Content-Disposition': 'inline' } : {}),
    },
  });
}
