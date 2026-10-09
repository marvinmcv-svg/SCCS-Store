import { Skeleton, ProductGridSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container-page pt-6 md:pt-12">
      <Skeleton className="h-10 w-40" />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-10">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
