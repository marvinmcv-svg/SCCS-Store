import 'server-only';
import { revalidateTag } from 'next/cache';
import { CATALOG_TAG } from '@/lib/catalog';

/** Expire catalog caches immediately after an admin write. */
export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
