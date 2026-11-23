import { apiClient } from "./api-client";

export interface InvoiceItem {
  id: string;
  variant_id: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  line_total_paise: number;
  product_name?: string;
  brand?: string;
  variant_label?: string;
}

export interface DiscountAllocation {
  id: string;
  discount_type: string;
  amount_paise: int_type;
  description?: string;
}

type int_type = number;

export interface Invoice {
  id: string;
  bulk_order_id: string;
  user_id: string;
  community_id: string;
  invoice_number: string;
  base_amount_paise: number;
  discount_amount_paise: number;
  delivery_fee_paise: number;
  total_amount_paise: number;
  paid_amount_paise: number;
  status: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "REFUNDED" | "CANCELLED" | string;
  created_at: string;
  paid_at?: string | null;
  items: InvoiceItem[];
  discounts: DiscountAllocation[];
}

export interface RetailerBill {
  id: string;
  bulk_order_id: string;
  retailer_id: string;
  community_id: string;
  bill_number: string;
  gross_amount_paise: number;
  discount_amount_paise: number;
  delivery_amount_paise: number;
  net_amount_paise: number;
  status: string;
  issued_at: string;
  finalized_at?: string | null;
}

export interface BillingPreviewInput {
  resident_requests: { user_id: string; variant_id: string; requested_qty: number }[];
  variant_packs: {
    variant_id: string;
    packed_qty: number;
    unit_price_paise: number;
    discount_paise?: number;
  }[];
  delivery_fee_paise?: number;
  order_discount_paise?: number;
  platform_fee_paise?: number;
  delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
}

export interface FinalizeBillingPayload {
  delivery_fee_paise?: number;
  order_discount_paise?: number;
  platform_fee_paise?: number;
  delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
  packing_updates?: {
    variant_id: string;
    packed_qty: number;
    discount_paise?: number;
  }[];
}

export const billingService = {
  async getMyInvoices(communityId?: string): Promise<Invoice[]> {
    const qs = communityId ? `?community_id=${encodeURIComponent(communityId)}` : "";
    return apiClient.get<Invoice[]>(`/api/v1/billing/invoices/me${qs}`);
  },

  async getInvoiceDetail(invoiceId: string): Promise<Invoice> {
    return apiClient.get<Invoice>(`/api/v1/billing/invoices/${invoiceId}`);
  },

  async getRetailerBill(billId: string): Promise<RetailerBill> {
    return apiClient.get<RetailerBill>(`/api/v1/billing/bills/${billId}`);
  },

  async getBulkOrderBill(orderId: string): Promise<RetailerBill> {
    return apiClient.get<RetailerBill>(`/api/v1/billing/bulk-orders/${orderId}/bill`);
  },

  async calculatePreview(payload: BillingPreviewInput): Promise<any> {
    return apiClient.post("/api/v1/billing/calculate", payload);
  },

  async finalizeBilling(orderId: string, payload: FinalizeBillingPayload): Promise<any> {
    return apiClient.post(`/api/v1/billing/bulk-orders/${orderId}/finalize`, payload);
  },
};
