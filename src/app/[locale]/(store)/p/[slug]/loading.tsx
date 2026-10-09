import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="md:container-page md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] md:gap-16 md:pt-8">
      <div className="grid gap-2 md:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full rounded-none md:rounded-[3px]" />
        <Skeleton className="hidden aspect-[4/5] w-full md:block" />
      </div>
      <div className="container-page space-y-4 pt-6 md:px-0 md:pt-0">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-4 gap-2 pt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
        <Skeleton className="h-[52px] w-full rounded-full" />
      </div>
    </div>
  );
}
