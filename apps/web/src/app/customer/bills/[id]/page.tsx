import { Suspense } from "react";
import { InvoiceDetailClient } from "./client";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={null}>
      <InvoiceDetailClient />
    </Suspense>
  );
}
