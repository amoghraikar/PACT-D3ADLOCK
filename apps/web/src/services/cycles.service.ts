import { apiClient } from "./api-client";

export interface ShoppingCycle {
  id: string;
  community_id: string;
  month: string;
  status: "OPEN" | "LOCKED" | "PROCESSING" | "COMPLETED";
  cutoff_time: string;
  total_items?: number;
  participating_households?: number;
  est_total_paise?: number;
  created_at: string;
}

export const cyclesService = {
  async getCurrentCycle(): Promise<ShoppingCycle> {
    return apiClient.get<ShoppingCycle>("/api/v1/cycles/current");
  },

  async getCycleById(id: string): Promise<ShoppingCycle> {
    return apiClient.get<ShoppingCycle>(`/api/v1/cycles/${id}`);
  },

  async consolidateCycle(id: string): Promise<{ message: string; bulk_order_id: string }> {
    return apiClient.post(`/api/v1/cycles/${id}/consolidate`, {});
  },
};
