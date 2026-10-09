import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPage, PAGE_SLUGS, type PageSlug } from '@/content/pages';
import { getSettings, pickupLocation } from '@/lib/settings';
import { school } from '@/config/school';
import { TOPS_CHART } from '@/config/sizing';
import { Accordion, AccordionItem } from '@/components/ui/accordion';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string; page: string }> };

export function generateStaticParams() {
  return PAGE_SLUGS.map((page) => ({ page }));
}

async function load(locale: string, slug: string) {
  if (!PAGE_SLUGS.includes(slug as PageSlug)) return null;
  const s = await getSettings();
  return getPage(slug as PageSlug, locale, {
    exchangeDays: s.store.exchangeDays,
    holdDays: s.store.payAtSchoolHoldDays,
    location: pickupLocation(s.store, locale),
    email: s.store.storeEmail,
    phone: school.phone,
    whatsapp: s.store.whatsapp,
    address: school.address,
    hours: locale === 'en' ? school.storeHours.en : school.storeHours.es,
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const p = await load(locale, page);
  return p ? { title: p.title, description: p.intro } : {};
}

export default async function InfoPage({ params }: Props) {
  const { locale, page } = await params;
  setRequestLocale(locale);
  const p = await load(locale, page);
  if (!p) notFound();
  const t = await getTranslations();
  return (
    <article className="container-page grid gap-10 pt-8 md:grid-cols-[220px_1fr] md:pt-16">
      <nav aria-label={t('footer.help')} className="hidden md:block">
        <ul className="sticky top-24 space-y-1">
          {PAGE_SLUGS.map((s) => (
            <li key={s}>
              <Link href={`/info/${s}`} aria-current={s === page ? 'page' : undefined} className={`t-body block py-1.5 ${s === page ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}>
                {t(`pages.${s === 'uniform-policy' ? 'uniformPolicy' : s === 'size-guide' ? 'sizeGuide' : s}` as 'pages.about')}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="max-w-2xl">
        <h1 className="t-h1">{p.title}</h1>
        <p className="t-body mt-4 text-[17px] text-ink-2">{p.intro}</p>
        {page === 'size-guide' && (
          <div className="mt-10 overflow-x-auto">
            <table className="t-body w-full tabular">
              <thead>
                <tr className="t-label text-left text-ink-2">
                  <th className="py-3 pr-4">{t('product.chartSize')}</th>
                  <th className="py-3 pr-4">{t('product.chartAge')}</th>
                  <th className="py-3 pr-4">{t('product.chartHeight')} (cm)</th>
                  <th className="py-3">{t('product.chartChest')} (cm)</th>
                </tr>
              </thead>
              <tbody>
                {TOPS_CHART.map((r) => (
                  <tr key={r.size} className="border-t border-line">
                    <td className="py-3 pr-4 font-medium">{r.size}</td>
                    <td className="py-3 pr-4">{r.age}</td>
                    <td className="py-3 pr-4">
                      {r.heightCm[0]}–{r.heightCm[1]}
                    </td>
                    <td className="py-3">
                      {r.chestCm[0]}–{r.chestCm[1]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {p.blocks.map((b, i) => (
          <section key={i} className="mt-10">
            {b.h && <h2 className="t-title mb-3">{b.h}</h2>}
            {b.p?.map((x, j) => (
              <p key={j} className="t-body mb-3 text-ink-2">
                {x}
              </p>
            ))}
            {b.list && (
              <ul className="t-body space-y-2 text-ink-2">
                {b.list.map((x, j) => (
                  <li key={j} className="flex gap-3">
                    <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" />
                    {x}
                  </li>
                ))}
              </ul>
            )}
            {b.qa && (
              <Accordion type="single" collapsible className="border-t border-line">
                {b.qa.map((x, j) => (
                  <AccordionItem key={j} value={String(j)} title={x.q}>
                    {x.a}
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>
        ))}
        {page === 'contact' && (
          <a href={`https://wa.me/${school.whatsapp}`} target="_blank" rel="noreferrer" className="pressable mt-8 inline-flex h-[52px] items-center gap-2 rounded-full bg-accent px-7 font-medium text-accent-ink">
            WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}
