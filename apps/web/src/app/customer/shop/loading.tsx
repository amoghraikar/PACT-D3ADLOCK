import { Skeleton } from "@/components/ui/Skeleton";

export default function ShopLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton width={200} height={36} />
        <Skeleton width={160} height={36} />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width={90} height={32} className="rounded-full" />
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-white border border-ice-200 rounded-xl p-4 space-y-3">
            <Skeleton height={140} className="w-full rounded-lg" />
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={14} />
            <div className="flex justify-between items-center pt-2">
              <Skeleton width={80} height={20} />
              <Skeleton width={60} height={32} className="rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
