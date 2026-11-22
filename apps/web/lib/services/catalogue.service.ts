import { apiClient } from "@/lib/api";

export interface Variant {
  id: string;
  label: string;
  pack_size: number;
  pack_unit: string;
  selling_price_paise: number;
  mrp_paise: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category_id: string;
  category_name: string;
  image_url: string;
  est_unit_price_paise: number;
  mrp_paise: number;
  variants: Variant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductsResponse {
  products: Product[];
  meta?: PaginationMeta;
}

export const CatalogueService = {
  async getCategories(): Promise<{ categories: Category[] }> {
    return apiClient<{ categories: Category[] }>("/api/v1/catalogue/categories");
  },

  async getProducts(params?: {
    category?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category && params.category !== "All") searchParams.set("category", params.category);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const qs = searchParams.toString();
    const endpoint = `/api/v1/catalogue/products${qs ? `?${qs}` : ""}`;
    return apiClient<ProductsResponse>(endpoint);
  },

  async getProductById(id: string): Promise<{ product: Product }> {
    return apiClient<{ product: Product }>(`/api/v1/catalogue/products/${id}`);
  },
};
