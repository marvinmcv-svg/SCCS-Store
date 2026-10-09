import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Pick the localized field (`nameEs` / `nameEn`) from a record. */
export function loc<T extends Record<string, unknown>>(obj: T, base: string, locale: string): string {
  const key = `${base}${locale === 'en' ? 'En' : 'Es'}`;
  const fallback = `${base}Es`;
  return String((obj[key] as string | null | undefined) || (obj[fallback] as string | null | undefined) || '');
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
