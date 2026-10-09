import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Crest (official raster supplied by the school) + wordmark. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn('pressable flex items-center gap-2.5', className)} aria-label="SCCS Store">
      <Image src="/brand/sccs-crest.jpg" alt="" width={36} height={36} priority className="size-9 rounded-[6px] mix-blend-multiply dark:bg-white dark:mix-blend-normal" />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[15px] font-semibold tracking-[-0.02em]">SCCS Store</span>
          <span className="t-label mt-0.5 block text-[9.5px] text-ink-2">Jaguars · Est. 1959</span>
        </span>
      )}
    </Link>
  );
}
