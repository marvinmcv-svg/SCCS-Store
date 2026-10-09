import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { formatBs } from '@/lib/money';

export type BundleCardData = {
  slug: string;
  name: string;
  grades: string;
  image: string | null;
  blur: string | null;
  totalCents: number;
  subtotalCents: number;
  discountPct: number;
  pieces: string;
  saveLabel: string;
};

export function BundleCard({ b, priority }: { b: BundleCardData; priority?: boolean }) {
  return (
    <Link href={`/bundles/${b.slug}`} className="pressable group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-bg-subtle">
        {b.image && (
          <Image
            src={b.image}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, 70vw"
            placeholder={b.blur ? 'blur' : 'empty'}
            blurDataURL={b.blur ?? undefined}
            className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]"
          />
        )}
        <Badge tone="accent" className="absolute top-2 left-2">
          {b.saveLabel}
        </Badge>
      </div>
      <div className="px-0.5 pt-3">
        <p className="t-label text-ink-2">{b.grades}</p>
        <h3 className="t-title mt-1">{b.name}</h3>
        <p className="t-body mt-1 flex items-baseline gap-2">
          <span className="tabular">{formatBs(b.totalCents)}</span>
          <s className="tabular text-ink-3">{formatBs(b.subtotalCents)}</s>
          <span className="t-caption text-ink-2">· {b.pieces}</span>
        </p>
      </div>
    </Link>
  );
}
