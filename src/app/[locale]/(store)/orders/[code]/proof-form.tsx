'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { submitProof } from '@/actions/orders';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function ProofForm({ code, token }: { code: string; token: string | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function pick(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!f) return setFile(null);
    if (!TYPES.includes(f.type)) return setError(t('order.proofInvalidType'));
    if (f.size > 5 * 1024 * 1024) return setError(t('order.proofTooLarge'));
    setFile(f);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !reference.trim()) return setError(t('order.proofNeedOne'));
    setPending(true);
    const fd = new FormData();
    fd.set('code', code);
    if (token) fd.set('token', token);
    if (file) fd.set('file', file);
    if (reference.trim()) fd.set('reference', reference.trim());
    const res = await submitProof(fd);
    setPending(false);
    if (!res.ok) return setError(t(`errors.${res.error}` as 'errors.UNKNOWN'));
    toast(t('order.proofSent'));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-line pt-6">
      <div>
        <p className="t-body font-medium">{t('order.proofTitle')}</p>
        <p className="t-caption text-ink-2">{t('order.proofBody')}</p>
      </div>
      <label className="pressable flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-line-strong bg-bg p-4 text-center hover:border-ink">
        <input type="file" accept={TYPES.join(',')} className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-48 rounded-[8px] object-contain" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-6 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
        )}
        <span className="t-body font-medium">{file ? file.name : t('order.proofFile')}</span>
      </label>
      <Field label={t('order.proofOr')} htmlFor="reference">
        <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t('order.proofReference')} className="bg-bg" />
      </Field>
      {error && (
        <p role="alert" className="t-caption text-red">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" block loading={pending}>
        {t('order.proofSubmit')}
      </Button>
    </form>
  );
}
