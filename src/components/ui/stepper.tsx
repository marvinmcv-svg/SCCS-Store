import { cn } from '@/lib/utils';

export type Step = { id: string; label: string; description?: string; at?: string };

/** Vertical timeline (order tracking) or compact horizontal (checkout). */
export function Stepper({
  steps,
  current,
  orientation = 'vertical',
  className,
}: {
  steps: Step[];
  current: number;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}) {
  if (orientation === 'horizontal') {
    return (
      <ol className={cn('flex items-center gap-2', className)} aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.id} className="flex flex-1 flex-col gap-2" aria-current={i === current ? 'step' : undefined}>
            <span
              className={cn(
                'h-[3px] rounded-full transition-colors duration-300',
                i <= current ? 'bg-accent' : 'bg-bg-muted',
              )}
            />
            <span className={cn('t-label', i <= current ? 'text-ink' : 'text-ink-3')}>{s.label}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className={cn('relative', className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="relative flex gap-4 pb-7 last:pb-0" aria-current={active ? 'step' : undefined}>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute top-6 left-[11px] h-[calc(100%-24px)] w-[2px]', done ? 'bg-accent' : 'bg-bg-muted')}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-[1] grid size-6 shrink-0 place-items-center rounded-full ring-2 transition-colors',
                done && 'bg-accent text-accent-ink ring-accent',
                active && 'bg-bg ring-accent',
                !done && !active && 'bg-bg ring-bg-muted',
              )}
            >
              {done ? (
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              ) : active ? (
                <span className="size-2.5 rounded-full bg-accent" />
              ) : null}
            </span>
            <div className="-mt-0.5">
              <p className={cn('t-body font-medium', !done && !active && 'text-ink-3')}>{s.label}</p>
              {(s.description || s.at) && (
                <p className="t-caption text-ink-2">{[s.at, s.description].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
