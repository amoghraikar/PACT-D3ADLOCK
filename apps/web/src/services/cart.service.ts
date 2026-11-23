import { apiClient } from "./api-client";

export interface CartItem {
  variant_id: string;
  name: string;
  brand: string;
  variant_label: string;
  quantity: number;
  est_unit_price_paise: number;
  mrp_paise: number;
  est_line_paise: number;
  pack_unit?: string;
  pack_size?: number;
}

export interface CommunityTotalItem {
  name: string;
  variant_label: string;
  total_quantity: number;
  total_base: string;
}

export interface CartResponse {
  cycle_month: string;
  status: string;
  locks_at: string;
  my_items: CartItem[];
  my_est_total_paise: number;
  community: {
    participants: number;
    items: CommunityTotalItem[];
  };
}

export const cartService = {
  async getCart(): Promise<CartResponse> {
    return apiClient.get<CartResponse>("/api/v1/cart");
  },

  async updateItemQuantity(
    variantId: string,
    quantity: number
  ): Promise<{ message: string; variant_id: string; quantity: number }> {
    return apiClient.put(`/api/v1/cart/items/${variantId}`, { quantity });
  },

  async removeItem(variantId: string): Promise<{ message: string; variant_id: string }> {
    return apiClient.delete(`/api/v1/cart/items/${variantId}`);
  },

  async batchUpdate(
    items: { variant_id: string; quantity: number }[]
  ): Promise<{ message: string; updated_count: number }> {
    return apiClient.post("/api/v1/cart/items:batch", { items });
  },
};

// Backward-compatible alias
export const CartService = cartService;
