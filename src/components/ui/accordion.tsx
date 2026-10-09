'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  value,
  title,
  children,
  className,
}: {
  value: string;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Item value={value} className={cn('border-b border-line', className)}>
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left t-title outline-none">
          {title}
          <span
            aria-hidden
            className="relative size-4 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-[1.5px] before:w-4 before:-translate-y-1/2 before:bg-current after:absolute after:top-0 after:left-1/2 after:h-4 after:w-[1.5px] after:-translate-x-1/2 after:bg-current after:transition-transform after:duration-200 group-data-[state=open]:after:scale-y-0"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_200ms_var(--ease-out)] data-[state=open]:animate-[accordion-down_260ms_var(--ease-out)]">
        <div className="t-body pb-6 text-ink-2">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
