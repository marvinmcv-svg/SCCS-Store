import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { school } from '@/config/school';
import { LocaleSwitcher, ThemeSwitcher } from './locale-theme';

export async function SiteFooter() {
  const t = await getTranslations();
  const col = 't-body block py-1.5 text-ink-2 transition-colors hover:text-ink';
  return (
    <footer className="mt-24 border-t border-line pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+24px)] md:pb-12">
      <div className="container-page grid gap-10 pt-12 md:grid-cols-4">
        <div>
          <p className="t-label mb-3 text-ink-2">{t('footer.help')}</p>
          <Link className={col} href="/info/faq">{t('footer.faq')}</Link>
          <Link className={col} href="/info/size-guide">{t('footer.sizeGuide')}</Link>
          <Link className={col} href="/orders/lookup">{t('profile.trackOrder')}</Link>
          <Link className={col} href="/info/contact">{t('footer.contact')}</Link>
        </div>
        <div>
          <p className="t-label mb-3 text-ink-2">{t('footer.store')}</p>
          <Link className={col} href="/info/about">{t('footer.about')}</Link>
          <Link className={col} href="/info/uniform-policy">{t('footer.uniformPolicy')}</Link>
          <Link className={col} href="/info/terms">{t('footer.terms')}</Link>
          <Link className={col} href="/info/privacy">{t('footer.privacy')}</Link>
        </div>
        <div>
          <p className="t-label mb-3 text-ink-2">{t('footer.school')}</p>
          <a className={col} href={school.website} target="_blank" rel="noreferrer">sccs.edu.bo</a>
          <a className={col} href={`https://instagram.com/${school.instagram}`} target="_blank" rel="noreferrer">@{school.instagram}</a>
          <a className={col} href={`tel:${school.phone.replace(/\s/g, '')}`}>{school.phone}</a>
          <a className={col} href={`mailto:${school.email}`}>{school.email}</a>
        </div>
        <div className="flex flex-col items-start gap-3">
          <LocaleSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
      <div className="container-page mt-12 flex flex-col gap-2 text-ink-2 md:flex-row md:justify-between">
        <p className="t-caption">{t('footer.rights', { year: new Date().getFullYear() })}</p>
        <p className="t-caption">{t('footer.pickupOnly')}</p>
      </div>
    </footer>
  );
}
