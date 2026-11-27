import type {
  AdminDashboardMetricsDTO,
  AdminDeliveryStatusDTO,
  AdminResidentInvoiceDTO,
  AuditLogDTO,
  AuthTokenResponseDTO,
  BillingCalculationResult,
  CartResponseDTO,
  CategorySummaryDTO,
  CycleSummaryDTO,
  InventoryItemDTO,
  InventoryMovementDTO,
  InvoiceDTO,
  NotificationChannel,
  NotificationItemDTO,
  NotificationPreferenceDTO,
  OtpRequestResponseDTO,
  PaginatedResponseDTO,
  PaymentHistoryItemDTO,
  PaymentOrderResponseDTO,
  PlatformCommunityDTO,
  PlatformConfigDTO,
  PlatformOverviewDTO,
  PlatformRetailerDTO,
  ProductSummaryDTO,
  RetailerBillDTO,
  RetailerDashboardMetricsDTO,
  RetailerOrderDetailDTO,
  RetailerOrderSummaryDTO,
  UserSummaryDTO,
  VoiceInterpretResponseDTO,
} from "@pact/shared";
import { api } from "./api";

export const authService = {
  requestOtp: (phone: string) =>
    api.post<OtpRequestResponseDTO>("/api/v1/auth/request-otp", { phone }, { skipAuth: true }),
  verifyOtp: (phone: string, otp: string) =>
    api.post<AuthTokenResponseDTO>("/api/v1/auth/verify-otp", { phone, otp }, { skipAuth: true }),
  me: () => api.get<UserSummaryDTO>("/api/v1/auth/me"),
  joinCommunity: (data: { community_code: string; unit_number: string; full_name?: string }) =>
    api.post<UserSummaryDTO>("/api/v1/auth/join-community", data),
  logout: () => api.post<{ message: string }>("/api/v1/auth/logout"),
};

export const catalogueService = {
  getCategories: () => api.get<CategorySummaryDTO[]>("/api/v1/catalogue/categories"),
  getProducts: (params?: { category_slug?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category_slug && params.category_slug !== "all")
      qs.set("category_slug", params.category_slug);
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<PaginatedResponseDTO<ProductSummaryDTO>>(
      `/api/v1/catalogue/products${q ? `?${q}` : ""}`
    );
  },
};

export const cyclesService = {
  getCurrent: () => api.get<CycleSummaryDTO>("/api/v1/cycles/current"),
  consolidate: (cycleId: string) =>
    api.post<{ message: string; bulk_order_id: string; order_number: string }>(
      `/api/v1/cycles/${cycleId}/consolidate`
    ),
};

export const cartService = {
  getCart: () => api.get<CartResponseDTO>("/api/v1/cart"),
  updateItem: (variantId: string, quantity: number, notes?: string) =>
    api.put<CartResponseDTO>(`/api/v1/cart/items/${variantId}`, { quantity, notes }),
  removeItem: (variantId: string) =>
    api.delete<CartResponseDTO>(`/api/v1/cart/items/${variantId}`),
};

export const voiceService = {
  interpret: (text: string, language: string) =>
    api.post<VoiceInterpretResponseDTO>("/api/v1/voice/interpret", { text, language }),
  confirm: (items: { variant_id: string; quantity: number }[]) =>
    api.post<{ added_count: number; cart_total_paise: number; cart: CartResponseDTO }>(
      "/api/v1/voice/confirm",
      { items }
    ),
};

export const billingService = {
  getMyInvoices: () => api.get<InvoiceDTO[]>("/api/v1/billing/invoices/me"),
  getInvoiceDetail: (id: string) => api.get<InvoiceDTO>(`/api/v1/billing/invoices/${id}`),
  getRetailerBillForOrder: (orderId: string) =>
    api.get<RetailerBillDTO>(`/api/v1/billing/bulk-orders/${orderId}/bill`),
};

export const paymentsService = {
  createOrder: (invoiceId: string) =>
    api.post<PaymentOrderResponseDTO>("/api/v1/payments/orders/create", { invoice_id: invoiceId }),
  verifyPayment: (payload: {
    invoice_id: string;
    gateway_order_id: string;
    payment_id: string;
    signature?: string;
  }) =>
    api.post<{
      status: string;
      invoice_id: string;
      transaction_id: string;
      paid_amount_paise: number;
      invoice_status: string;
    }>("/api/v1/payments/verify", payload),
  getHistory: (invoiceId: string) =>
    api.get<PaymentHistoryItemDTO[]>(`/api/v1/payments/invoices/${invoiceId}/history`),
};

export const retailerService = {
  getDashboard: () => api.get<RetailerDashboardMetricsDTO>("/api/v1/retailer/dashboard"),
  getOrders: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<PaginatedResponseDTO<RetailerOrderSummaryDTO>>(
      `/api/v1/retailer/orders${q ? `?${q}` : ""}`
    );
  },
  getOrderDetail: (orderId: string) =>
    api.get<RetailerOrderDetailDTO>(`/api/v1/retailer/orders/${orderId}`),
  acceptOrder: (orderId: string) =>
    api.post<{ id: string; status: string; message: string }>(
      `/api/v1/retailer/orders/${orderId}/accept`
    ),
  rejectOrder: (orderId: string, reason: string) =>
    api.post<{ id: string; status: string; reason: string }>(
      `/api/v1/retailer/orders/${orderId}/reject`,
      { reason }
    ),
  updatePacking: (
    orderId: string,
    items: { variant_id: string; packed_qty: number; is_unavailable: boolean; notes?: string }[]
  ) =>
    api.post<{ order_id: string; status: string; total_packed_items: number; subtotal_paise: number }>(
      `/api/v1/retailer/orders/${orderId}/packing`,
      { items }
    ),
  previewBill: (
    orderId: string,
    params?: {
      delivery_fee_paise?: number;
      order_discount_paise?: number;
      delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
    }
  ) => {
    const qs = new URLSearchParams();
    if (params?.delivery_fee_paise !== undefined)
      qs.set("delivery_fee_paise", String(params.delivery_fee_paise));
    if (params?.order_discount_paise !== undefined)
      qs.set("order_discount_paise", String(params.order_discount_paise));
    if (params?.delivery_allocation_mode)
      qs.set("delivery_allocation_mode", params.delivery_allocation_mode);
    const q = qs.toString();
    return api.get<BillingCalculationResult>(
      `/api/v1/retailer/orders/${orderId}/bill-preview${q ? `?${q}` : ""}`
    );
  },
  sendBill: (
    orderId: string,
    payload: {
      delivery_fee_paise?: number;
      order_discount_paise?: number;
      delivery_allocation_mode?: "EQUAL" | "PRO_RATA";
    }
  ) =>
    api.post<{
      message: string;
      bulk_order_id: string;
      bill_id: string;
      invoices_count: number;
      net_amount_paise: number;
    }>(`/api/v1/retailer/orders/${orderId}/send-bill`, payload),
  dispatchOrder: (orderId: string) =>
    api.post<{ id: string; status: string; dispatched_at: string }>(
      `/api/v1/retailer/orders/${orderId}/dispatch`
    ),
  getInventory: (params?: { low_stock?: boolean; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.low_stock) qs.set("low_stock", "true");
    if (params?.search) qs.set("search", params.search);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return api.get<PaginatedResponseDTO<InventoryItemDTO>>(
      `/api/v1/retailer/inventory${q ? `?${q}` : ""}`
    );
  },
  inwardStock: (payload: {
    variant_id: string;
    quantity: number;
    batch_number: string;
    cost_price_paise: number;
    supplier_name?: string;
  }) => api.post("/api/v1/retailer/inventory/inward", payload),
  adjustStock: (
    inventoryId: string,
    payload: { quantity_delta: number; reason: string; reorder_level_qty?: number }
  ) => api.patch(`/api/v1/retailer/inventory/${inventoryId}`, payload),
  getMovements: (page = 1, limit = 30) =>
    api.get<PaginatedResponseDTO<InventoryMovementDTO>>(
      `/api/v1/retailer/inventory/movements?page=${page}&limit=${limit}`
    ),
};

export const adminService = {
  getCommunity: () =>
    api.get<{
      id: string;
      name: string;
      code: string;
      address: string;
      city: string;
      total_apartments: number;
      registered_households: number;
    }>("/api/v1/admin/community"),
  getDashboard: () => api.get<AdminDashboardMetricsDTO>("/api/v1/admin/dashboard"),
  getCycle: () => api.get<CycleSummaryDTO>("/api/v1/admin/cycle"),
  getInvoices: (status?: "paid" | "unpaid") =>
    api.get<AdminResidentInvoiceDTO[]>(
      `/api/v1/admin/invoices${status ? `?status=${status}` : ""}`
    ),
  remindInvoice: (invoiceId: string, channels: NotificationChannel[], customMessage?: string) =>
    api.post<{
      invoice_id: string;
      recipient_name: string;
      channels_confirmed: NotificationChannel[];
      details: { channel: NotificationChannel; status: string; reason?: string }[];
    }>(`/api/v1/admin/invoices/${invoiceId}/remind`, {
      channels,
      custom_message: customMessage,
    }),
  getDeliveries: () => api.get<AdminDeliveryStatusDTO | null>("/api/v1/admin/deliveries"),
  confirmHandover: (handoverId: string, notes?: string) =>
    api.post<{ handover_id: string; status: string }>(
      `/api/v1/admin/deliveries/handovers/${handoverId}/confirm`,
      { notes }
    ),
};

export const platformService = {
  getOverview: () => api.get<PlatformOverviewDTO>("/api/v1/platform/overview"),
  getCommunities: () => api.get<PlatformCommunityDTO[]>("/api/v1/platform/communities"),
  createCommunity: (payload: {
    name: string;
    code: string;
    address: string;
    city: string;
    postal_code: string;
  }) => api.post<PlatformCommunityDTO>("/api/v1/platform/communities", payload),
  getRetailers: () => api.get<PlatformRetailerDTO[]>("/api/v1/platform/retailers"),
  createRetailer: (payload: {
    owner_name: string;
    phone: string;
    store_name: string;
    business_address: string;
    gstin?: string;
  }) => api.post<PlatformRetailerDTO>("/api/v1/platform/retailers", payload),
  mapRetailer: (payload: {
    retailer_id: string;
    community_id: string;
    delivery_fee_paise: number;
  }) => api.post("/api/v1/platform/retailer-mappings", payload),
  getOrders: () =>
    api.get<
      {
        id: string;
        order_number: string;
        cycle_month: string;
        community_name: string;
        retailer_name: string;
        status: string;
        total_requested_items: number;
        total_packed_items: number;
        total_paise: number;
        placed_at: string;
      }[]
    >("/api/v1/platform/orders"),
  getConfig: () => api.get<PlatformConfigDTO>("/api/v1/platform/config"),
  updateConfig: (payload: PlatformConfigDTO) =>
    api.put<PlatformConfigDTO>("/api/v1/platform/config", payload),
  getAuditLogs: (params?: { action?: string; entity_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set("action", params.action);
    if (params?.entity_type) qs.set("entity_type", params.entity_type);
    const q = qs.toString();
    return api.get<AuditLogDTO[]>(`/api/v1/platform/audit-logs${q ? `?${q}` : ""}`);
  },
};

export const notificationsService = {
  list: (unreadOnly = false) =>
    api.get<NotificationItemDTO[]>(`/api/v1/notifications${unreadOnly ? "?unread_only=true" : ""}`),
  getUnreadCount: () => api.get<{ unread_count: number }>("/api/v1/notifications/unread-count"),
  markRead: (id: string) => api.post<NotificationItemDTO>(`/api/v1/notifications/${id}/read`),
  markAllRead: () => api.post<{ marked_read: number }>("/api/v1/notifications/read-all"),
  getPreferences: () => api.get<NotificationPreferenceDTO[]>("/api/v1/notifications/preferences"),
  updatePreferences: (preferences: NotificationPreferenceDTO[]) =>
    api.put<NotificationPreferenceDTO[]>("/api/v1/notifications/preferences", { preferences }),
};
