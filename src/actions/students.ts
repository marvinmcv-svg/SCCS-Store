'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { run, ActionError } from '@/lib/action';
import { requireUser } from '@/lib/session';
import { GRADES, SIZED_GARMENTS } from '@/config/catalog';
import { withSize } from '@/lib/students';

const studentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'required').max(40),
  grade: z.enum(GRADES),
  section: z.string().trim().max(10).optional().nullable(),
  fit: z.enum(['UNISEX', 'BOYS', 'GIRLS']).default('UNISEX'),
});

export async function saveStudent(input: z.input<typeof studentSchema>) {
  return run(async () => {
    const user = await requireUser();
    const d = studentSchema.parse(input);
    // Data minimisation: first name only.
    const name = d.name.split(/\s+/)[0];
    if (d.id) {
      const owned = await db.student.findFirst({ where: { id: d.id, parentId: user.id } });
      if (!owned) throw new ActionError('FORBIDDEN');
      await db.student.update({ where: { id: d.id }, data: { name, grade: d.grade, section: d.section || null, fit: d.fit } });
    } else {
      const count = await db.student.count({ where: { parentId: user.id } });
      if (count >= 8) throw new ActionError('LIMIT');
      await db.student.create({ data: { parentId: user.id, name, grade: d.grade, section: d.section || null, fit: d.fit } });
    }
    revalidatePath('/[locale]/profile', 'layout');
    return null;
  });
}

export async function deleteStudent(id: string) {
  return run(async () => {
    const user = await requireUser();
    const owned = await db.student.findFirst({ where: { id, parentId: user.id } });
    if (!owned) throw new ActionError('FORBIDDEN');
    await db.student.delete({ where: { id } });
    revalidatePath('/[locale]/profile', 'layout');
    return null;
  });
}

/** "Still fits?" → yes: refresh the timestamp of the saved size. */
export async function confirmStudentSize(studentId: string, garmentType: string, size: string) {
  return run(async () => {
    const user = await requireUser();
    if (!SIZED_GARMENTS.includes(garmentType as (typeof SIZED_GARMENTS)[number])) throw new ActionError('INVALID');
    const s = await db.student.findFirst({ where: { id: studentId, parentId: user.id } });
    if (!s) throw new ActionError('FORBIDDEN');
    await db.student.update({ where: { id: studentId }, data: { sizes: withSize(s.sizes, garmentType, size) } });
    return null;
  });
}

const prefsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional(),
  locale: z.enum(['es', 'en']),
  notifyEmail: z.boolean(),
  notifyWhatsapp: z.boolean(),
});

export async function updatePreferences(input: z.input<typeof prefsSchema>) {
  return run(async () => {
    const user = await requireUser();
    const d = prefsSchema.parse(input);
    await db.user.update({ where: { id: user.id }, data: d });
    return null;
  });
}
