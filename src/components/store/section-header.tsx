import { Link } from '@/i18n/navigation';

export function SectionHeader({ title, href, linkLabel, eyebrow }: { title: string; href?: string; linkLabel?: string; eyebrow?: string }) {
  return (
    <div className="container-page mb-5 flex items-end justify-between gap-4 md:mb-7">
      <div>
        {eyebrow && <p className="t-label mb-2 text-ink-2">{eyebrow}</p>}
        <h2 className="t-h2">{title}</h2>
      </div>
      {href && linkLabel && (
        <Link href={href} className="pressable t-body shrink-0 font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
