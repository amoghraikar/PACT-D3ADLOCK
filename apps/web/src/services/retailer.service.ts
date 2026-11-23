import { apiClient } from "./api-client";

export interface RetailerDashboardMetrics {
  total_orders: number;
  pending_orders: number;
  packing_orders: number;
  billed_orders: number;
  dispatched_orders: number;
  completed_orders: number;
  gross_order_value_paise: number;
  monthly_sales_paise: number;
  outstanding_collections_paise: number;
  low_stock_items_count: number;
}

export interface RetailerOrderSummary {
  id: string;
  order_number: string;
  cycle_id: string;
  cycle_month: string;
  community_id: string;
  community_name: string;
  retailer_id: string;
  status: "PENDING" | "ACCEPTED" | "PACKING" | "BILLED" | "DISPATCHED" | "COMPLETED" | "REJECTED" | string;
  total_requested_items: number;
  total_packed_items: number;
  subtotal_paise: number;
  discount_paise: number;
  delivery_fee_paise: number;
  total_paise: number;
  placed_at: string;
  locked_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  participating_households_count: number;
}

export interface RetailerOrderItemDetail {
  id: string;
  variant_id: string;
  product_id: string;
  product_title: string;
  brand: string;
  variant_title: string;
  variant_sku: string;
  variant_unit: string;
  category_name: string;
  requested_qty: number;
  packed_qty: number;
  short_packed_qty: number;
  is_unavailable: boolean;
  unit_price_paise: number;
  subtotal_paise: number;
}

export interface RetailerOrderDetail extends RetailerOrderSummary {
  items: RetailerOrderItemDetail[];
  retailer_bill: any | null;
}

export interface InventoryItem {
  id: string;
  retailer_id: string;
  variant_id: string;
  product_title: string;
  brand: string;
  variant_title: string;
  sku: string;
  pack_unit: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_threshold: number;
  is_low_stock: boolean;
  is_available: boolean;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  movement_type: "INWARD" | "OUTWARD_PACKED" | "ADJUSTMENT" | "RETURN";
  quantity: number;
  balance_before: number;
  balance_after: number;
  batch_number: string | null;
  reference_order_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const retailerService = {
  async getDashboard(): Promise<RetailerDashboardMetrics> {
    return apiClient.get<RetailerDashboardMetrics>("/api/v1/retailer/dashboard");
  },

  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<RetailerOrderSummary>> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    return apiClient.get<PaginatedResult<RetailerOrderSummary>>(`/api/v1/retailer/orders${qs ? `?${qs}` : ""}`);
  },

  async getOrderDetail(orderId: string): Promise<RetailerOrderDetail> {
    return apiClient.get<RetailerOrderDetail>(`/api/v1/retailer/orders/${orderId}`);
  },

  async acceptOrder(orderId: string): Promise<{ order_id: string; status: string; message: string }> {
    return apiClient.post(`/api/v1/retailer/orders/${orderId}/accept`, {});
  },

  async rejectOrder(orderId: string, reason: string): Promise<{ order_id: string; status: string; message: string }> {
    return apiClient.post(`/api/v1/retailer/orders/${orderId}/reject`, { reason });
  },

  async updatePacking(
    orderId: string,
    items: {
      variant_id: string;
      packed_qty: number;
      batch_id?: string | null;
      notes?: string | null;
      is_unavailable?: boolean;
    }[]
  ): Promise<any> {
    return apiClient.post(`/api/v1/retailer/orders/${orderId}/packing`, { items });
  },

  async getBillPreview(orderId: string): Promise<any> {
    return apiClient.get(`/api/v1/retailer/orders/${orderId}/bill-preview`);
  },

  async sendBill(
    orderId: string,
    payload?: {
      delivery_fee_paise?: number;
      order_discount_paise?: number;
      platform_fee_paise?: number;
      delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
    }
  ): Promise<any> {
    return apiClient.post(`/api/v1/retailer/orders/${orderId}/send-bill`, payload || {});
  },

  async dispatchOrder(orderId: string): Promise<any> {
    return apiClient.post(`/api/v1/retailer/orders/${orderId}/dispatch`, {});
  },

  async getInventory(params?: {
    low_stock?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<InventoryItem>> {
    const searchParams = new URLSearchParams();
    if (params?.low_stock) searchParams.set("low_stock", "true");
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    return apiClient.get<PaginatedResult<InventoryItem>>(`/api/v1/retailer/inventory${qs ? `?${qs}` : ""}`);
  },

  async inwardStock(payload: {
    variant_id: string;
    quantity: number;
    batch_number?: string;
    unit_cost_paise?: number;
    notes?: string;
  }): Promise<any> {
    return apiClient.post("/api/v1/retailer/inventory/inward", payload);
  },

  async adjustStock(
    inventoryId: string,
    payload: {
      new_quantity: number;
      reason: string;
    }
  ): Promise<any> {
    return apiClient.patch(`/api/v1/retailer/inventory/${inventoryId}`, payload);
  },

  async getMovements(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<InventoryMovement>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    return apiClient.get<PaginatedResult<InventoryMovement>>(`/api/v1/retailer/inventory/movements${qs ? `?${qs}` : ""}`);
  },
};
