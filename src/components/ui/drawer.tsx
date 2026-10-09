'use client';

import * as React from 'react';
import { Drawer as Vaul } from 'vaul';
import { cn } from '@/lib/utils';

/** Right-side drawer (desktop bag, admin filters). */
export function SideDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Vaul.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-[var(--z-drawer)] bg-overlay" />
        <Vaul.Content
          className={cn(
            'fixed top-2 right-2 bottom-2 z-[var(--z-drawer)] flex w-[min(440px,calc(100vw-16px))] flex-col rounded-[var(--radius-lg)] bg-bg-elevated shadow-3 outline-none',
            className,
          )}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <Vaul.Title className="t-title">{title}</Vaul.Title>
            <Vaul.Description className="sr-only">{title}</Vaul.Description>
            <Vaul.Close
              className="pressable -mr-2 grid size-11 place-items-center rounded-full text-ink-2 hover:bg-bg-subtle"
              aria-label="Cerrar / Close"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Vaul.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6">{children}</div>
          {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
