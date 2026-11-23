import { Skeleton } from "@/components/ui/Skeleton";

export default function RetailerInventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Skeleton width={200} height={32} />
        <div className="flex gap-2">
          <Skeleton width={140} height={36} />
          <Skeleton width={120} height={36} />
        </div>
      </div>

      <div className="bg-white border border-ice-200 rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-ice-100 last:border-b-0">
            <div className="space-y-1">
              <Skeleton width={180} height={18} />
              <Skeleton width={100} height={14} />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton width={70} height={20} />
              <Skeleton width={80} height={28} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
