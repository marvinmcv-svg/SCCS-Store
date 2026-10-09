import { RowSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-page pt-6 md:pt-12">
      <Skeleton className="h-10 w-32" />
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_380px]">
        <RowSkeleton rows={3} />
        <Skeleton className="h-60 w-full" />
      </div>
    </div>
  );
}
