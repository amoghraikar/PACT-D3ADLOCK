import { Skeleton } from "@/components/ui/Skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton width={200} height={32} />
        <Skeleton width={100} height={32} className="rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-ice-200 rounded-xl p-5 space-y-2">
            <Skeleton width="40%" height={14} />
            <Skeleton width="70%" height={28} />
          </div>
        ))}
      </div>

      <div className="bg-white border border-ice-200 rounded-xl p-5 space-y-4">
        <Skeleton width={160} height={20} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-ice-100 last:border-b-0">
            <Skeleton width={140} height={16} />
            <Skeleton width={80} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}
