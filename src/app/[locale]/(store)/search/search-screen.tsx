'use client';

import * as React from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { searchCatalog } from '@/actions/catalog';
import { ProductCard } from '@/components/store/product-card';
import { FavoriteButton } from '@/components/store/favorite-button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { ShopIcon } from '@/components/ui/icons';

type Results = Awaited<ReturnType<typeof searchCatalog>>;
const RECENT_KEY = 'sccs:recent-searches';

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Full-screen instant search: recent searches, popular terms, live results. */
export function SearchScreen({ initialQuery, initial }: { initialQuery: string; initial: Results | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = React.useState(initialQuery);
  const [results, setResults] = React.useState<Results | null>(initial);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const popular = t('search.popularTerms').split(',');

  React.useEffect(() => {
    inputRef.current?.focus();
    const r = readRecent();
    if (r.length) queueMicrotask(() => setRecent(r));
  }, []);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let alive = true;
    const id = setTimeout(async () => {
      setLoading(true);
      const r = await searchCatalog(term, locale);
      if (!alive) return;
      setResults(r);
      setLoading(false);
      router.replace(`/search?q=${encodeURIComponent(term)}`, { scroll: false });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [q, locale, router]);

  const remember = (term: string) => {
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  };

  const term = q.trim();
  const showResults = term.length >= 2 && results;

  return (
    <div className="container-page pt-4 md:pt-10">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) remember(term);
          inputRef.current?.blur();
        }}
        className="relative"
      >
        <label htmlFor="q" className="sr-only">
          {t('search.title')}
        </label>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-2" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <input
          ref={inputRef}
          id="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 w-full rounded-full bg-bg-subtle pr-12 pl-12 text-[17px] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-accent"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="pressable absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-bg-muted" aria-label={t('search.clear')}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </form>

      {!showResults && (
        <div className="mt-8 space-y-8">
          {recent.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="t-label text-ink-2">{t('search.recent')}</h2>
                <button
                  type="button"
                  className="t-caption text-ink-2 underline underline-offset-4"
                  onClick={() => {
                    setRecent([]);
                    try {
                      localStorage.removeItem(RECENT_KEY);
                    } catch {}
                  }}
                >
                  {t('search.clear')}
                </button>
              </div>
              <ul>
                {recent.map((r) => (
                  <li key={r}>
                    <button type="button" onClick={() => setQ(r)} className="pressable flex min-h-12 w-full items-center gap-3 text-left t-body">
                      <svg viewBox="0 0 24 24" className="size-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v4l3 2" />
                      </svg>
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="t-label mb-3 text-ink-2">{t('search.popular')}</h2>
            <div className="flex flex-wrap gap-2">
              {popular.map((p) => (
                <Chip key={p} size="sm" onClick={() => setQ(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </section>
        </div>
      )}

      {term.length >= 2 && loading && !results && (
        <div className="mt-8">
          <ProductGridSkeleton count={4} />
        </div>
      )}

      {showResults && (
        <div className="mt-8" aria-live="polite">
          {results.products.length === 0 && results.bundles.length === 0 ? (
            <EmptyState icon={<ShopIcon className="size-7" />} title={t('search.noResults', { q: term })} description={t('search.noResultsBody')} />
          ) : (
            <>
              {results.bundles.length > 0 && (
                <section className="mb-10">
                  <h2 className="t-label mb-3 text-ink-2">{t('search.bundles')}</h2>
                  <ul className="divide-y divide-line">
                    {results.bundles.map((b) => (
                      <li key={b.slug}>
                        <Link href={`/bundles/${b.slug}`} onClick={() => remember(term)} className="pressable flex items-center gap-4 py-3">
                          <span className="relative size-16 shrink-0 overflow-hidden rounded-[3px] bg-bg-subtle">{b.image && <Image src={b.image} alt="" fill sizes="64px" className="object-cover" />}</span>
                          <span className="flex-1">
                            <span className="t-body block font-medium">{b.name}</span>
                            <span className="t-caption tabular text-ink-2">{b.price}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.products.length > 0 && (
                <section>
                  <h2 className="t-label mb-4 text-ink-2">{t('search.products')}</h2>
                  <ul className={`grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 md:gap-x-4 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`} onClick={() => remember(term)}>
                    {results.products.map((p) => (
                      <li key={p.id}>
                        <ProductCard product={p} fromLabel={t('common.from')} action={<FavoriteButton productId={p.id} />} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
