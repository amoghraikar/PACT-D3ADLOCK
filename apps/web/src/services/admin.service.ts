import { apiClient } from "./api-client";

export interface CommunityOverview {
  community_id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  postal_code: string;
  total_buildings: number;
  total_apartments: number;
  total_registered_households: number;
}

export interface AdminDashboardMetrics {
  community_id: string;
  community_name: string;
  cycle_month: string;
  total_households: number;
  participating_households: number;
  total_billing_amount_paise: number;
  amount_collected_paise: number;
  outstanding_amount_paise: number;
  collection_percentage: number;
  deliveries_pending: number;
  deliveries_completed: number;
}

export interface AdminCycleOverview {
  cycle_id: string;
  cycle_month: string;
  cutoff_at: string;
  status: string;
  seconds_until_cutoff: number;
  is_cutoff_passed: boolean;
  total_requested_units: number;
  total_packed_units: number;
  total_order_amount_paise: number;
  participating_households_count: number;
}

export interface ResidentCollectionItem {
  invoice_id: string;
  invoice_number: string;
  user_id: string;
  resident_name: string;
  phone: string;
  apartment_unit: string | null;
  building_name: string | null;
  total_amount_paise: number;
  paid_amount_paise: number;
  outstanding_amount_paise: number;
  status: string;
  last_reminder_at: string | null;
}

export interface ResidentCollectionResponse {
  items: ResidentCollectionItem[];
  total_invoices: number;
  total_billed_paise: number;
  total_collected_paise: number;
  total_outstanding_paise: number;
}

export interface DeliveryHandoverItem {
  handover_id: string;
  delivery_id: string;
  invoice_id: string;
  invoice_number: string;
  recipient_user_id: string;
  recipient_name: string;
  phone: string;
  apartment_unit: string | null;
  building_name: string | null;
  status: "pending" | "handed_over" | string;
  handover_timestamp: string | null;
  handed_over_by_name: string | null;
  notes: string | null;
}

export interface DeliveryStatusResponse {
  delivery_id: string;
  bulk_order_id: string;
  order_number: string;
  status: string;
  dispatched_at: string | null;
  arrived_at_gate: string | null;
  completed_at: string | null;
  total_handovers: number;
  pending_handovers: number;
  completed_handovers: number;
  handovers: DeliveryHandoverItem[];
}

export const adminService = {
  async getCommunity(): Promise<CommunityOverview> {
    return apiClient.get<CommunityOverview>("/api/v1/admin/community");
  },

  async getDashboard(): Promise<AdminDashboardMetrics> {
    return apiClient.get<AdminDashboardMetrics>("/api/v1/admin/dashboard");
  },

  async getCurrentCycle(): Promise<AdminCycleOverview> {
    return apiClient.get<AdminCycleOverview>("/api/v1/admin/cycle");
  },

  async getInvoices(): Promise<ResidentCollectionResponse> {
    return apiClient.get<ResidentCollectionResponse>("/api/v1/admin/invoices");
  },

  async triggerReminder(
    invoiceId: string,
    channels: ("in_app" | "sms" | "whatsapp")[] = ["in_app", "sms", "whatsapp"],
    customMessage?: string
  ): Promise<any> {
    return apiClient.post(`/api/v1/admin/invoices/${invoiceId}/remind`, {
      channels,
      custom_message: customMessage || undefined,
    });
  },

  async getDeliveries(): Promise<DeliveryStatusResponse> {
    return apiClient.get<DeliveryStatusResponse>("/api/v1/admin/deliveries");
  },

  async confirmHandover(handoverId: string, notes?: string): Promise<any> {
    return apiClient.post(`/api/v1/admin/deliveries/handovers/${handoverId}/confirm`, {
      notes: notes || undefined,
    });
  },
};
