import { Suspense } from "react";
import { RetailerOrderDetailClient } from "./client";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function RetailerOrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <RetailerOrderDetailClient />
    </Suspense>
  );
}
