import { apiClient } from "./api-client";

export interface PlatformHealthMetrics {
  status: string;
  database: string;
  active_communities_count: number;
  active_retailers_count: number;
  total_users_count: number;
  time_utc: string;
  environment: string;
}

export interface PlatformCommunityItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  postal_code: string;
  is_active: boolean;
  total_members: number;
  total_apartments: number;
  created_at: string;
}

export interface PlatformRetailerItem {
  id: string;
  user_id: string;
  store_name: string;
  business_address: string;
  gstin: string | null;
  phone: string;
  status: string;
  associated_communities_count: number;
}

export interface GlobalTransactionSummary {
  total_orders: number;
  total_gross_paise: number;
  total_discount_paise: number;
  total_delivery_fee_paise: number;
  total_net_paise: number;
  total_collected_paise: number;
  total_outstanding_paise: number;
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  user_phone: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  payload_before: string | null;
  payload_after: string | null;
  created_at: string;
}

export const platformService = {
  async getHealth(): Promise<PlatformHealthMetrics> {
    return apiClient.get<PlatformHealthMetrics>("/api/v1/platform/health");
  },

  async getCommunities(): Promise<PlatformCommunityItem[]> {
    return apiClient.get<PlatformCommunityItem[]>("/api/v1/platform/communities");
  },

  async createCommunity(payload: {
    name: string;
    code: string;
    address: string;
    city?: string;
    postal_code: string;
  }): Promise<PlatformCommunityItem> {
    return apiClient.post<PlatformCommunityItem>("/api/v1/platform/communities", payload);
  },

  async getRetailers(): Promise<PlatformRetailerItem[]> {
    return apiClient.get<PlatformRetailerItem[]>("/api/v1/platform/retailers");
  },

  async createRetailer(payload: {
    phone: string;
    full_name: string;
    store_name: string;
    business_address: string;
    gstin?: string;
  }): Promise<PlatformRetailerItem> {
    return apiClient.post<PlatformRetailerItem>("/api/v1/platform/retailers", payload);
  },

  async mapRetailerToCommunity(payload: {
    retailer_id: string;
    community_id: string;
    delivery_fee_paise?: number;
    is_primary?: boolean;
    is_active?: boolean;
  }): Promise<any> {
    return apiClient.post("/api/v1/platform/retailer-mappings", payload);
  },

  async getTransactions(): Promise<GlobalTransactionSummary> {
    return apiClient.get<GlobalTransactionSummary>("/api/v1/platform/transactions");
  },

  async getConfig(): Promise<any> {
    return apiClient.get("/api/v1/platform/config");
  },

  async updateConfig(payload: any): Promise<any> {
    return apiClient.patch("/api/v1/platform/config", payload);
  },

  async getAuditLogs(params?: {
    limit?: number;
    entity_type?: string;
  }): Promise<AuditLogItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.entity_type) searchParams.set("entity_type", params.entity_type);
    const qs = searchParams.toString();
    return apiClient.get<AuditLogItem[]>(`/api/v1/platform/audit-logs${qs ? `?${qs}` : ""}`);
  },
};
