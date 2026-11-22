import { Skeleton } from "@/components/ui/Skeleton";

export default function RetailerOrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton width={240} height={32} />
        <Skeleton width={120} height={36} />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-ice-200 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton width={180} height={20} />
              <Skeleton width={90} height={24} className="rounded-full" />
            </div>
            <Skeleton width="50%" height={16} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <Skeleton height={40} className="w-full" />
              <Skeleton height={40} className="w-full" />
              <Skeleton height={40} className="w-full" />
              <Skeleton height={40} className="w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
