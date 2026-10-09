import { Link } from '@/i18n/navigation';

export function AnnouncementBar({ text, href }: { text: string; href?: string | null }) {
  const inner = <span className="t-caption truncate font-medium">{text}</span>;
  return (
    <div className="flex h-9 items-center justify-center bg-bg-subtle px-4 text-center">
      {href ? (
        <Link href={href} className="truncate underline-offset-4 hover:underline">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
