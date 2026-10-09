'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * iOS-style collapsing large title. The big title scrolls away and a compact
 * title fades into the sticky bar. Pure scroll listener, no layout thrash.
 */
export function TopBar({
  title,
  leading,
  trailing,
  children,
  className,
}: {
  title: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const sentinel = React.useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-2 px-2 transition-[background-color,box-shadow] duration-200 md:hidden',
          collapsed ? 'bg-bg/85 shadow-[0_1px_0_var(--line)] backdrop-blur-xl' : 'bg-bg',
          className,
        )}
      >
        <div className="flex min-w-11 items-center">{leading}</div>
        <p
          className={cn(
            't-body flex-1 truncate text-center font-medium transition-opacity duration-200',
            collapsed ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden={!collapsed}
        >
          {title}
        </p>
        <div className="flex min-w-11 items-center justify-end">{trailing}</div>
      </div>
      <div className="container-page pt-1 pb-4 md:pt-10 md:pb-6">
        <h1 className="t-h1">{title}</h1>
        {children}
      </div>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
  );
}
