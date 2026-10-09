import * as React from 'react';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-[10px] bg-bg-subtle px-4 text-[16px] text-ink placeholder:text-ink-3 outline-none ring-1 ring-inset ring-transparent transition-[box-shadow,background-color] duration-200 hover:ring-line-strong focus:bg-bg focus:ring-2 focus:ring-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(field, 'h-12', className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(field, 'py-3 leading-normal', className)} {...props} />;
  },
);

/** Native select: best one-handed UX on phones (OS picker). */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(field, 'h-12 appearance-none pr-10', className)} {...props}>
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('t-caption mb-1.5 block font-medium text-ink', className)} {...props} />;
}

/** Label + control + hint/error, wired with aria-describedby. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
  optionalLabel = 'Opcional',
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<{ 'aria-invalid'?: boolean; 'aria-describedby'?: string; id?: string }>;
  className?: string;
  optional?: boolean;
  optionalLabel?: string;
}) {
  const describedBy = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-ink-3">· {optionalLabel}</span>}
      </Label>
      {React.cloneElement(children, {
        id: htmlFor,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="t-caption mt-1.5 text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="t-caption mt-1.5 text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
