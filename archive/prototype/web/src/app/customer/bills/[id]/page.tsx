import CustomerBillPage from "../../bill/page";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "1" },
    { id: "ord-comm-green-2026-11" },
  ];
}

export default function CustomerBillDetailPage() {
  return <CustomerBillPage />;
}
