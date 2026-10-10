'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Small, premium motion helpers (see globals.css "Motion").
 * Rules: 150–300ms ease-out, count-ups under 1s, never more than three
 * things moving at once, nothing at all with prefers-reduced-motion.
 */

const STAGGER_MS = 40;
const LANES = 3;
const lanes: number[] = Array(LANES).fill(0);
let lastStart = 0;

/**
 * Global scheduler: returns the delay (ms) before a motion of `duration`
 * may start so that starts are ≥40ms apart and ≤3 motions overlap.
 */
function schedule(duration: number) {
  const now = performance.now();
  lanes.sort((a, b) => a - b);
  const start = Math.max(now, lastStart + STAGGER_MS, lanes[0]);
  lanes[0] = start + duration;
  lastStart = start;
  return start - now;
}

const format = (n: number) => String(n);
const reduced = () => typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function markHydrated() {
  document.documentElement.classList.add('hydrated');
}

/** Cards in `ref` (direct children marked data-stagger-item) rise in once, staggered. */
export function useStagger(ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    markHydrated();
    const el = ref.current;
    if (!el) return;
    if (reduced() || !('IntersectionObserver' in window)) {
      el.dataset.in = '';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        el.querySelectorAll<HTMLElement>(':scope > [data-stagger-item]').forEach((item) => {
          const r = item.getBoundingClientRect();
          const visible = r.left < vw && r.right > 0 && r.top < vh && r.bottom > 0;
          // Off-screen cards (further along a rail) just appear: no motion nobody sees.
          if (!visible) item.dataset.static = '';
          else item.style.setProperty('--d', `${Math.round(schedule(260))}ms`);
        });
        el.dataset.in = '';
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
}

/** Grid/list wrapper whose children rise in with a 40ms stagger. */
export function Stagger({ children, className, as: Tag = 'div' }: { children: React.ReactNode; className?: string; as?: 'div' | 'ul' }) {
  const ref = React.useRef<HTMLDivElement & HTMLUListElement>(null);
  useStagger(ref);
  return (
    <Tag ref={ref} data-stagger="" className={className}>
      {React.Children.map(children, (child) =>
        child == null ? null : Tag === 'ul' ? (
          <li data-stagger-item="">{child}</li>
        ) : (
          <div data-stagger-item="">{child}</div>
        ),
      )}
    </Tag>
  );
}

/**
 * Counts up once (≤900ms, ease-out) when it scrolls into view. The final
 * value is server-rendered and also reserves the width, so nothing shifts.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    markHydrated();
    const el = ref.current;
    if (!el || reduced() || !('IntersectionObserver' in window)) return;
    el.textContent = format(0);
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const ms = 900;
        timer = setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / ms);
            el.textContent = format(Math.round(value * (1 - Math.pow(1 - t, 3))));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, schedule(ms));
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      el.textContent = format(value);
    };
  }, [value]);

  return (
    <span className={cn('tabular inline-grid', className)}>
      <span className="sr-only">{value}</span>
      {/* Invisible final value holds the width while the visible one counts. */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {format(value)}
      </span>
      <span ref={ref} aria-hidden className="col-start-1 row-start-1 text-right">
        {format(value)}
      </span>
    </span>
  );
}
