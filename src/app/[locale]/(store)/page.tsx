import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { getActiveProducts, getBundles, getHomeContent, toCard } from '@/lib/catalog';
import { cardLabels } from '@/lib/card-labels';
import { toBundleCards } from '@/lib/bundle-cards';
import { getCurrentUser } from '@/lib/session';
import { studentChecklists } from '@/lib/checklist';
import { getSettings } from '@/lib/settings';
import { loc } from '@/lib/utils';
import { DIVISIONS, gradeLabel } from '@/config/catalog';
import { Hero } from '@/components/store/home/hero';
import { ProductRail } from '@/components/store/product-rail';
import { SectionHeader } from '@/components/store/section-header';
import { BundleCard } from '@/components/store/bundle-card';
import { Carousel } from '@/components/ui/carousel';
import { ButtonLink } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, content, products, bundles, labels, user, settings] = await Promise.all([
    getTranslations(),
    getHomeContent(),
    getActiveProducts(),
    getBundles(),
    cardLabels(),
    getCurrentUser(),
    getSettings(),
  ]);
  const checklists = user ? await studentChecklists(user.id, locale) : [];
  const card = (p: (typeof products)[number]) => toCard(p, locale, labels);
  // A product may appear in several rails; only its first card gets the
  // shared-element transition name (names must be unique per page).
  const seen = new Set<string>();
  const firstSeen = (ids: string[]) => {
    const allowed = new Set(ids.filter((id) => !seen.has(id)));
    ids.forEach((id) => seen.add(id));
    return allowed;
  };
  const hero = content.banners.find((b) => b.placement === 'home-hero');
  const editorial = content.banners.find((b) => b.placement === 'home-editorial');
  const essentials = content.collections.find((c) => c.slug === 'esenciales');
  const bundleCards = await toBundleCards(bundles, locale);
  const byCat = (slug: string) => products.filter((p) => p.category.slug === slug).map(card);
  const categoryTiles = ['uniforms', 'pe', 'bags', 'accessories', 'souvenirs'].map((slug) => ({
    slug,
    image: products.find((p) => p.category.slug === slug)?.images[0],
  }));

  return (
    <>
      {hero && (
        <Hero
          data={{
            eyebrow: loc(hero, 'eyebrow', locale),
            title: loc(hero, 'title', locale),
            subtitle: loc(hero, 'subtitle', locale),
            cta: { label: loc(hero, 'ctaLabel', locale), href: hero.href },
            cta2: { label: t('home.heroCta2'), href: '/bundles' },
            imageMobile: hero.imageMobile,
            imageDesktop: hero.imageDesktop,
            blur: hero.imageBlur,
            priority: true,
            tall: true,
          }}
        />
      )}

      {/* Shop by grade */}
      <section className="pt-8 md:pt-12" aria-labelledby="by-grade">
        <h2 id="by-grade" className="container-page t-label mb-4 text-ink-2">
          {t('home.shopByGrade')}
        </h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-[var(--gutter)]">
          {checklists.map((c) => (
            <Link key={c.studentId} href={`/shop?grade=${c.grade}&student=${c.studentId}`}>
              <Chip selected tabIndex={-1}>
                {c.name} · {gradeLabel(c.grade, locale)}
              </Chip>
            </Link>
          ))}
          {DIVISIONS.map((d) => (
            <Link key={d.id} href={`/shop?grade=${d.grades.join(',')}`}>
              <Chip tabIndex={-1}>{locale === 'en' ? d.en : d.es}</Chip>
            </Link>
          ))}
        </div>
      </section>

      {(() => {
        const list = products.filter((p) => p.isNew).map(card);
        return <ProductRail title={t('home.newArrivals')} href="/shop?sort=new" products={list} priorityFirst morphIds={firstSeen(list.map((p) => p.id))} />;
      })()}

      {essentials &&
        (() => {
          const list = essentials.items.map((i) => card(i.product));
          return <ProductRail title={loc(essentials, 'title', locale)} href="/shop/uniforms" products={list} morphIds={firstSeen(list.map((p) => p.id))} />;
        })()}

      {/* Bundles */}
      <section className="py-8 md:py-12" aria-label={t('home.bundles')}>
        <SectionHeader title={t('home.bundles')} eyebrow={t('home.bundlesBody')} href="/bundles" linkLabel={t('common.seeAll')} />
        <Carousel ariaLabel={t('home.bundles')} itemClassName="w-[72%] sm:w-[44%] lg:w-[31.5%]" prevLabel={t('common.prev')} nextLabel={t('common.next')}>
          {bundleCards.map((b) => (
            <BundleCard key={b.slug} b={b} />
          ))}
        </Carousel>
      </section>

      {/* Complete the uniform */}
      <section className="container-page py-8 md:py-12" aria-labelledby="complete">
        <div className="rounded-[4px] bg-bg-subtle p-6 md:p-10">
          <h2 id="complete" className="t-h2">
            {t('home.completeUniform')}
          </h2>
          {checklists.length === 0 ? (
            <div className="mt-3 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
              <p className="t-body max-w-md text-ink-2">{t('home.completeUniformGuest')}</p>
              <ButtonLink href={user ? '/profile/students' : '/register?callbackUrl=/profile/students'}>{t('home.createProfile')}</ButtonLink>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {checklists.map((c) => (
                <div key={c.studentId} className="rounded-[4px] bg-bg p-5">
                  <p className="t-title">
                    {c.name} <span className="text-ink-2">· {gradeLabel(c.grade, locale)}</span>
                  </p>
                  <p className="t-caption mt-1 text-ink-2">{t('home.completeUniformBody', { name: c.name })}</p>
                  <ul className="mt-4 divide-y divide-line">
                    {c.items.map((i) => (
                      <li key={i.id}>
                        <Link href={i.owned ? '#' : i.href} aria-disabled={i.owned} className="flex min-h-12 items-center justify-between gap-3 py-2">
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden
                              className={`grid size-5 place-items-center rounded-full ${i.owned ? 'bg-success text-white' : 'ring-1 ring-line-strong'}`}
                            >
                              {i.owned && (
                                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
                                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                                </svg>
                              )}
                            </span>
                            <span className={`t-body ${i.owned ? 'text-ink-2' : ''}`}>{i.label}</span>
                          </span>
                          <span className={`t-label ${i.owned ? 'text-success' : 'text-ink'}`}>{i.owned ? t('profile.owned') : `${t('profile.missing')} →`}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ProductRail title={t('home.pe')} href="/shop/pe" products={byCat('pe')} morphIds={firstSeen(byCat('pe').map((p) => p.id))} />

      {editorial && (
        <div className="py-8 md:py-12">
          <Hero
            data={{
              eyebrow: loc(editorial, 'eyebrow', locale),
              title: loc(editorial, 'title', locale),
              subtitle: loc(editorial, 'subtitle', locale),
              cta: { label: loc(editorial, 'ctaLabel', locale), href: editorial.href },
              imageMobile: editorial.imageMobile,
              imageDesktop: editorial.imageDesktop,
              blur: editorial.imageBlur,
            }}
          />
        </div>
      )}

      <ProductRail title={t('home.bags')} href="/shop/bags" products={byCat('bags')} morphIds={firstSeen(byCat('bags').map((p) => p.id))} />
      <ProductRail title={t('home.souvenirs')} href="/shop/souvenirs" products={byCat('souvenirs')} morphIds={firstSeen(byCat('souvenirs').map((p) => p.id))} />

      {/* Category tiles */}
      <section className="py-8 md:py-12" aria-label={t('shop.browseCategories')}>
        <SectionHeader title={t('shop.browseCategories')} />
        <div className="container-page grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-4">
          {categoryTiles.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="pressable group relative block aspect-square overflow-hidden rounded-[3px] bg-bg-subtle">
              {c.image && (
                <Image src={c.image.url} alt="" fill sizes="(min-width: 768px) 20vw, 50vw" className="object-contain p-[12%] transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-105" />
              )}
              <span className="t-title absolute bottom-3 left-3">{t(`categories.${c.slug}`)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-page py-8 md:py-12" aria-label="SCCS Store">
        <ul className="grid gap-px overflow-hidden rounded-[4px] bg-line md:grid-cols-3">
          {[
            { title: t('home.trustPickup'), body: t('home.trustPickupBody'), icon: 'M4 10h16M6 10V6h12v4M5 10v10h14V10M10 20v-5h4v5' },
            { title: t('home.trustOfficial'), body: t('home.trustOfficialBody'), icon: 'M12 3c3 0 6 .7 8 1.5v6.5c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10V4.5C6 3.7 9 3 12 3zm-3.5 9 2.5 2.5 4.5-5' },
            { title: t('home.trustExchange'), body: t('home.trustExchangeBody', { days: settings.store.exchangeDays }), icon: 'M4 8h13l-3-3M20 16H7l3 3' },
          ].map((x) => (
            <li key={x.title} className="flex gap-4 bg-bg p-6">
              <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={x.icon} />
              </svg>
              <div>
                <p className="t-body font-medium">{x.title}</p>
                <p className="t-caption mt-1 text-ink-2">{x.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
