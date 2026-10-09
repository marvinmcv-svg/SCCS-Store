'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { UserIcon } from '@/components/ui/icons';
import { toast } from '@/components/ui/toaster';
import { GRADES, GARMENT_LABELS, gradeLabel, type GarmentType } from '@/config/catalog';
import { monthsBetween } from '@/lib/dates';
import type { SavedSizes } from '@/lib/students';
import type { StudentChecklist } from '@/lib/checklist';
import { deleteStudent, saveStudent } from '@/actions/students';

type Student = { id: string; name: string; grade: string; section: string | null; fit: string; sizes: SavedSizes };
const schema = z.object({
  name: z.string().trim().min(1, 'required').max(40),
  grade: z.enum(GRADES),
  section: z.string().max(10).optional(),
  fit: z.enum(['UNISEX', 'BOYS', 'GIRLS']),
});
type Values = z.infer<typeof schema>;

export function StudentsManager({ students, checklists, openNew }: { students: Student[]; checklists: StudentChecklist[]; openNew: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = React.useState<Student | 'new' | null>(openNew ? 'new' : null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', grade: '1', section: '', fit: 'UNISEX' } });

  const open = (s: Student | 'new') => {
    form.reset(s === 'new' ? { name: '', grade: '1', section: '', fit: 'UNISEX' } : { name: s.name, grade: s.grade as Values['grade'], section: s.section ?? '', fit: s.fit as Values['fit'] });
    setEditing(s);
  };
  React.useEffect(() => {
    if (openNew) form.reset({ name: '', grade: '1', section: '', fit: 'UNISEX' });
  }, [openNew, form]);

  async function onSubmit(v: Values) {
    const res = await saveStudent({ ...v, id: editing && editing !== 'new' ? editing.id : undefined });
    if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    toast(t('profile.studentSaved'));
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="container-page pt-6 md:pt-12">
      <Link href="/profile" className="t-caption text-ink-2 hover:text-ink">
        ← {t('nav.profile')}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-h1">{t('profile.students')}</h1>
          <p className="t-body mt-2 text-ink-2">{t('profile.studentsBody')}</p>
        </div>
        <Button onClick={() => open('new')}>+ {t('profile.addStudent')}</Button>
      </div>

      {students.length === 0 ? (
        <EmptyState icon={<UserIcon className="size-7" />} title={t('profile.addStudent')} description={t('profile.privacyNote')} action={<Button onClick={() => open('new')}>{t('profile.addStudent')}</Button>} />
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {students.map((s) => {
            const cl = checklists.find((c) => c.studentId === s.id);
            const sizes = Object.entries(s.sizes);
            return (
              <li key={s.id} className="rounded-[4px] bg-bg-subtle p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="t-title">{s.name}</p>
                    <p className="t-caption text-ink-2">
                      {gradeLabel(s.grade, locale)}
                      {s.section && ` · ${t('profile.section')} ${s.section}`} · {t(`shop.fit${s.fit}` as 'shop.fitUNISEX')}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => open(s)}>
                    {t('common.edit')}
                  </Button>
                </div>
                <p className="t-label mt-5 mb-2 text-ink-2">{t('profile.savedSizes')}</p>
                {sizes.length === 0 ? (
                  <p className="t-caption text-ink-2">{t('profile.noSizes')}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {sizes.map(([g, v]) => (
                      <li key={g} className="rounded-[8px] bg-bg px-3 py-2">
                        <span className="t-caption block text-ink-2">{GARMENT_LABELS[g as GarmentType]?.[locale === 'en' ? 'en' : 'es'] ?? g}</span>
                        <span className="t-body font-medium">{t('profile.lastSize', { size: v.size, months: monthsBetween(new Date(v.updatedAt), new Date()) })}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {cl && (
                  <>
                    <p className="t-label mt-5 mb-2 text-ink-2">{t('profile.checklist', { name: s.name })}</p>
                    <ul className="space-y-1.5">
                      {cl.items.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-3">
                          <span className={`t-body ${i.owned ? 'text-ink-2' : ''}`}>{i.label}</span>
                          {i.owned ? (
                            <span className="t-label text-success">✓ {t('profile.owned')}</span>
                          ) : (
                            <Link href={i.href} className="t-label text-ink underline underline-offset-4">
                              {t('profile.missing')} →
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? t('profile.addStudent') : t('profile.editStudent')} description={t('profile.privacyNote')}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label={t('profile.studentName')} htmlFor="st-name" hint={t('profile.studentNameHint')} error={form.formState.errors.name && t('errors.required')}>
            <Input autoComplete="off" {...form.register('name')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('profile.grade')} htmlFor="st-grade">
              <Select {...form.register('grade')}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {gradeLabel(g, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('profile.section')} htmlFor="st-section" optional optionalLabel={t('common.optional')}>
              <Input maxLength={10} {...form.register('section')} />
            </Field>
          </div>
          <Field label={t('profile.fit')} htmlFor="st-fit">
            <Select {...form.register('fit')}>
              {(['UNISEX', 'BOYS', 'GIRLS'] as const).map((f) => (
                <option key={f} value={f}>
                  {t(`shop.fit${f}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="lg" block loading={form.formState.isSubmitting}>
            {t('common.save')}
          </Button>
          {editing && editing !== 'new' && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              block
              className="text-red"
              onClick={async () => {
                if (!confirm(t('profile.deleteStudentConfirm', { name: editing.name }))) return;
                const res = await deleteStudent(editing.id);
                if (!res.ok) return toast.error(t(`errors.${res.error}` as 'errors.UNKNOWN'));
                toast(t('profile.studentDeleted'));
                setEditing(null);
                router.refresh();
              }}
            >
              {t('profile.deleteStudent')}
            </Button>
          )}
        </form>
      </BottomSheet>
    </div>
  );
}
