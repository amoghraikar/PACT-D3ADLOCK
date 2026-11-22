import { apiClient } from "@/lib/api";

export interface OrderLine {
  customer_id: string;
  customer_name: string;
  unit_label: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  mrp_paise: number;
}

export interface RetailerOrder {
  id: string;
  order_no: string;
  community_id: string;
  cycle_month: string;
  status: string;
  submitted_at: string;
  item_count: number;
  total_requested_units: number;
  gross_est_paise: number;
  final_bill_paise?: number;
}

export const OrdersService = {
  async getRetailerOrders(status?: string): Promise<{ orders: RetailerOrder[] }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return apiClient<{ orders: RetailerOrder[] }>(`/api/v1/retailer/orders${qs}`);
  },

  async getOrderDetail(orderId: string): Promise<any> {
    return apiClient(`/api/v1/retailer/orders/${orderId}`);
  },

  async acceptOrder(orderId: string): Promise<any> {
    return apiClient(`/api/v1/retailer/orders/${orderId}/accept`, { method: "POST" });
  },

  async updatePacking(orderId: string, lines: { customer_id: string; variant_id: string; packed_qty: number }[]): Promise<any> {
    return apiClient(`/api/v1/retailer/orders/${orderId}/packing`, {
      method: "PUT",
      body: JSON.stringify({ lines }),
    });
  },

  async sendBill(orderId: string): Promise<any> {
    return apiClient(`/api/v1/retailer/orders/${orderId}/send-bill`, { method: "POST" });
  },

  async resetOrder(orderId: string): Promise<any> {
    return apiClient(`/api/v1/retailer/orders/${orderId}/reset`, { method: "POST" });
  },
};
