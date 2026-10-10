'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useStagger } from './motion';

/**
 * Snap-scrolling rail. Native scroll keeps momentum and accessibility;
 * desktop gets prev/next buttons. Items bleed to the screen edge on mobile.
 */
export function Carousel({
  children,
  className,
  itemClassName = 'w-[46%] sm:w-[31%] lg:w-[23.5%]',
  ariaLabel,
  prevLabel = 'Anterior',
  nextLabel = 'Siguiente',
  stagger = true,
}: {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  ariaLabel: string;
  prevLabel?: string;
  nextLabel?: string;
  /** Cards rise in with a 40ms stagger the first time the rail is seen. */
  stagger?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const staggerRef = React.useRef<HTMLDivElement>(null);
  useStagger(staggerRef);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  return (
    <div className={cn('group/carousel relative', className)}>
      <div
        ref={(node) => {
          ref.current = node;
          if (stagger) staggerRef.current = node;
        }}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        data-stagger={stagger ? '' : undefined}
        // py/-my leave room for the 4px hover lift without changing layout.
        className="no-scrollbar -my-2 flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-2 overflow-x-auto overscroll-x-contain px-[var(--gutter)] py-2 md:gap-4"
      >
        {React.Children.map(children, (child) =>
          child ? (
            <div data-stagger-item={stagger ? '' : undefined} className={cn('shrink-0 snap-start', itemClassName)}>
              {child}
            </div>
          ) : null,
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[35%] hidden justify-between px-4 md:flex">
        <button
          type="button"
          aria-label={prevLabel}
          onClick={() => scroll(-1)}
          className={cn(
            'pressable pointer-events-auto grid size-11 place-items-center rounded-full bg-bg/90 shadow-2 backdrop-blur transition-opacity',
            edges.start ? 'opacity-0' : 'opacity-0 group-hover/carousel:opacity-100',
          )}
          tabIndex={edges.start ? -1 : 0}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={nextLabel}
          onClick={() => scroll(1)}
          className={cn(
            'pressable pointer-events-auto grid size-11 place-items-center rounded-full bg-bg/90 shadow-2 backdrop-blur transition-opacity',
            edges.end ? 'opacity-0' : 'opacity-0 group-hover/carousel:opacity-100',
          )}
          tabIndex={edges.end ? -1 : 0}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
