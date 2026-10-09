import 'server-only';
import { db } from '@/lib/db';
import { UNIFORM_CHECKLIST } from '@/config/catalog';

export type ChecklistItem = { id: string; label: string; owned: boolean; href: string };
export type StudentChecklist = { studentId: string; name: string; grade: string; items: ChecklistItem[]; missing: number };

/**
 * "Complete the uniform": which policy pieces each student already owns,
 * derived from past (non-cancelled) orders assigned to them.
 */
export async function studentChecklists(parentId: string, locale: string): Promise<StudentChecklist[]> {
  const students = await db.student.findMany({ where: { parentId }, orderBy: { createdAt: 'asc' } });
  if (!students.length) return [];
  const items = await db.orderItem.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, order: { status: { notIn: ['CANCELLED', 'EXPIRED'] } } },
    select: { studentId: true, garmentType: true },
  });
  return students.map((s) => {
    const owned = new Set(items.filter((i) => i.studentId === s.id).map((i) => i.garmentType));
    const list = UNIFORM_CHECKLIST.map((c) => ({
      id: c.id,
      label: locale === 'en' ? c.en : c.es,
      owned: c.garments.some((g) => owned.has(g)),
      href: `/shop?garment=${c.garments.join(',')}&grade=${s.grade}&student=${s.id}`,
    }));
    return { studentId: s.id, name: s.name, grade: s.grade, items: list, missing: list.filter((i) => !i.owned).length };
  });
}
