import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { studentChecklists } from '@/lib/checklist';
import { parseSizes } from '@/lib/students';
import { StudentsManager } from './students-manager';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: 'profile' });
  return { title: t('students'), robots: { index: false } };
}

export default async function StudentsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ new?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) redirect({ href: '/login?callbackUrl=/profile/students', locale });
  const [students, checklists] = await Promise.all([
    db.student.findMany({ where: { parentId: user!.id }, orderBy: { createdAt: 'asc' } }),
    studentChecklists(user!.id, locale),
  ]);
  return (
    <StudentsManager
      openNew={(await searchParams).new === '1'}
      students={students.map((s) => ({ id: s.id, name: s.name, grade: s.grade, section: s.section, fit: s.fit, sizes: parseSizes(s.sizes) }))}
      checklists={checklists}
    />
  );
}
