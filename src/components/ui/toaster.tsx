'use client';

import { Toaster as Sonner } from 'sonner';

export { toast } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      offset={16}
      mobileOffset={{ top: 12, left: 12, right: 12 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-[14px] bg-ink px-4 py-3 text-bg shadow-3 md:w-[360px] t-body',
          title: 'font-medium',
          description: 't-caption opacity-70',
          actionButton: 'ml-auto rounded-full bg-bg px-3 py-1.5 text-[13px] font-medium text-ink',
          error: '!bg-red !text-white',
        },
      }}
    />
  );
}
