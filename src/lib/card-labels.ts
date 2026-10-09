import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { Labels } from '@/lib/catalog';

export async function cardLabels(): Promise<Labels> {
  const t = await getTranslations('product');
  return { new: t('new'), soldOut: t('soldOut'), preorder: t('preorder') };
}
