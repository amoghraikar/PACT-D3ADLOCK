import { apiClient } from "@/lib/api";

export interface CartItem {
  variant_id: string;
  name: string;
  brand: string;
  variant_label: string;
  quantity: number;
  est_unit_price_paise: number;
  mrp_paise: number;
  est_line_paise: number;
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

export const CartService = {
  async getCart(): Promise<CartResponse> {
    return apiClient<CartResponse>("/api/v1/cart");
  },

  async updateItemQuantity(variantId: string, quantity: number): Promise<{ message: string; variant_id: string; quantity: number }> {
    return apiClient(`/api/v1/cart/items/${variantId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  },

  async removeItem(variantId: string): Promise<{ message: string; variant_id: string }> {
    return apiClient(`/api/v1/cart/items/${variantId}`, {
      method: "DELETE",
    });
  },

  async batchUpdate(items: { variant_id: string; quantity: number }[]): Promise<{ message: string; updated_count: number }> {
    return apiClient("/api/v1/cart/items:batch", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  },
};
