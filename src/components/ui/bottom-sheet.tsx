'use client';

import * as React from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

/**
 * Draggable bottom sheet (vaul). On ≥md screens it renders as a centered
 * dialog-like sheet so desktop users don't get a phone pattern.
 */
export function BottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[var(--z-sheet)] bg-overlay" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[var(--z-sheet)] mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-[var(--radius-sheet)] bg-bg-elevated outline-none md:bottom-6 md:rounded-[var(--radius-sheet)] md:shadow-3',
            className,
          )}
        >
          <Drawer.Handle className="mt-2.5 mb-1 !h-1 !w-9 !bg-line-strong" />
          <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-2">
            <div>
              <Drawer.Title className="t-title">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="t-caption mt-1 text-ink-2">{description}</Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">{title}</Drawer.Description>
              )}
            </div>
            <Drawer.Close
              className="pressable -mt-1 -mr-2 grid size-11 place-items-center rounded-full text-ink-2 hover:bg-bg-subtle"
              aria-label="Cerrar / Close"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Drawer.Close>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5" data-vaul-no-drag={undefined}>
            {children}
          </div>
          {footer && <div className="safe-bottom border-t border-line px-5 pt-3 pb-3">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
