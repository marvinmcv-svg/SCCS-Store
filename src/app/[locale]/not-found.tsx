import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';
import { Logo } from '@/components/store/logo';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <div className="flex min-h-[100svh] flex-col">
      <div className="container-page flex h-16 items-center">
        <Logo />
      </div>
      <div className="container-page flex flex-1 flex-col items-start justify-center pb-24">
        <p className="t-label text-ink-2">404</p>
        <h1 className="t-display mt-4 max-w-3xl">{t('notFoundTitle')}</h1>
        <p className="t-body mt-4 max-w-md text-ink-2">{t('notFoundBody')}</p>
        <ButtonLink href="/" size="lg" className="mt-8">
          {t('goHome')}
        </ButtonLink>
      </div>
    </div>
  );
}
