import type { Prisma } from '@prisma/client';
import { monthsBetween } from '@/lib/dates';
import { school } from '@/config/school';

export type SavedSize = { size: string; updatedAt: string };
export type SavedSizes = Record<string, SavedSize>;

export function parseSizes(json: Prisma.JsonValue | null | undefined): SavedSizes {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  const out: SavedSizes = {};
  for (const [k, v] of Object.entries(json)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as SavedSize).size === 'string') {
      out[k] = { size: (v as SavedSize).size, updatedAt: String((v as SavedSize).updatedAt ?? new Date(0).toISOString()) };
    }
  }
  return out;
}

export function withSize(json: Prisma.JsonValue | null | undefined, garment: string, size: string): Prisma.InputJsonObject {
  return { ...parseSizes(json), [garment]: { size, updatedAt: new Date().toISOString() } };
}

/** "Sofia's last size was M, 8 months ago. Still fits?" */
export function needsRecheck(saved: SavedSize | undefined, now = new Date()) {
  if (!saved) return null;
  const months = monthsBetween(new Date(saved.updatedAt), now);
  return months >= school.policy.sizeRecheckMonths ? months : null;
}
