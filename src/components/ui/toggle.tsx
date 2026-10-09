'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Toggle({
  className,
  label,
  description,
  id,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { label?: string; description?: string }) {
  const autoId = React.useId();
  const switchId = id ?? autoId;
  const control = (
    <SwitchPrimitive.Root
      id={switchId}
      className={cn(
        'pressable relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full bg-bg-muted transition-colors data-[state=checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[27px] translate-x-[2px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] transition-transform duration-200 ease-[var(--ease-out)] data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
  if (!label) return control;
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={switchId} className="flex-1 cursor-pointer">
        <span className="t-body block font-medium">{label}</span>
        {description && <span className="t-caption block text-ink-2">{description}</span>}
      </label>
      {control}
    </div>
  );
}
