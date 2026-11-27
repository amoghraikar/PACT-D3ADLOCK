import type { CycleStatus, InvoiceStatus, NotificationChannel, OrderStatus, RoleName } from "./constants.js";
import type { BillingCalculationResult } from "./f7-billing.js";

// =============================================================================
// Auth & Identity DTOs
// =============================================================================

export interface UserMembershipDTO {
  community_id: string;
  community_name: string;
  community_code: string;
  apartment_id: string | null;
  unit_number: string | null;
  role: string;
}

export interface RetailerProfileDTO {
  id: string;
  store_name: string;
  business_address: string;
  phone: string;
  gstin: string | null;
  status: string;
}

export interface UserSummaryDTO {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  language: string;
  role: RoleName;
  communities: UserMembershipDTO[];
  retailer: RetailerProfileDTO | null;
}

export interface OtpRequestResponseDTO {
  message: string;
  expires_in_seconds: number;
  dev_otp?: string;
}

export interface AuthTokenResponseDTO {
  access_token: string;
  token_type: "bearer";
  user: UserSummaryDTO;
}

// =============================================================================
// Catalogue DTOs
// =============================================================================

export interface CategorySummaryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  product_count: number;
}

export interface ProductVariantDTO {
  id: string;
  sku: string;
  title: string;
  unit: string;
  pack_quantity: number;
  mrp_paise: number;
  default_price_paise: number;
  is_available: boolean;
  current_stock_qty: number | null;
}

export interface ProductSummaryDTO {
  id: string;
  title: string;
  brand: string | null;
  description: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  primary_image_url: string | null;
  min_price_paise: number;
  max_price_paise: number;
  variants_count: number;
  is_available: boolean;
  variants: ProductVariantDTO[];
}

export interface PaginationMetaDTO {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponseDTO<T> {
  data: T[];
  meta: PaginationMetaDTO;
}

// =============================================================================
// Collective Cart & Cycles DTOs
// =============================================================================

export interface CycleSummaryDTO {
  id: string;
  community_id: string;
  community_name: string;
  cycle_month: string;
  cutoff_at: string;
  status: CycleStatus;
  time_remaining_seconds: number;
  is_cutoff_passed: boolean;
  participating_households_count: number;
}

export interface PersonalCartItemDTO {
  id: string;
  variant_id: string;
  product_id: string;
  product_title: string;
  product_brand: string | null;
  variant_title: string;
  variant_sku: string;
  variant_unit: string;
  unit_price_paise: number;
  mrp_paise: number;
  quantity: number;
  subtotal_paise: number;
  primary_image_url: string | null;
  community_aggregate_qty: number;
  notes: string | null;
}

export interface CommunityPoolItemDTO {
  variant_id: string;
  product_title: string;
  variant_title: string;
  variant_unit: string;
  total_quantity: number;
  unit_price_paise: number;
  estimated_subtotal_paise: number;
}

export interface CommunityCartSummaryDTO {
  total_distinct_items: number;
  total_units_count: number;
  participating_households_count: number;
  estimated_total_paise: number;
  pool_items: CommunityPoolItemDTO[];
}

export interface CartResponseDTO {
  cycle: CycleSummaryDTO;
  items: PersonalCartItemDTO[];
  personal_total_paise: number;
  community_summary: CommunityCartSummaryDTO;
}

// =============================================================================
// Billing & Payments DTOs
// =============================================================================

export interface InvoiceItemDTO {
  id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  variant_unit: string;
  requested_qty: number;
  packed_qty: number;
  unit_price_paise: number;
  line_total_paise: number;
}

export interface DiscountAllocationDTO {
  id: string;
  discount_type: string;
  amount_paise: number;
  description: string | null;
}

export interface InvoiceDTO {
  id: string;
  bulk_order_id: string;
  user_id: string;
  community_id: string;
  community_name: string;
  cycle_month: string;
  invoice_number: string;
  base_amount_paise: number;
  discount_amount_paise: number;
  delivery_fee_paise: number;
  total_amount_paise: number;
  paid_amount_paise: number;
  status: InvoiceStatus;
  created_at: string;
  paid_at: string | null;
  items: InvoiceItemDTO[];
  discounts: DiscountAllocationDTO[];
}

export interface RetailerBillDTO {
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
  finalized_at: string | null;
}

export interface PaymentOrderResponseDTO {
  order_id: string;
  invoice_id: string;
  amount_paise: number;
  currency: "INR";
  gateway: string;
  key_id: string;
  customer_phone: string;
  customer_name: string;
}

export interface PaymentHistoryItemDTO {
  id: string;
  amount_paise: number;
  gateway: string;
  gateway_order_id: string | null;
  transaction_id: string | null;
  status: string;
  recorded_at: string;
}

// =============================================================================
// Retailer Order & Inventory DTOs
// =============================================================================

export interface RetailerDashboardMetricsDTO {
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

export interface RetailerOrderSummaryDTO {
  id: string;
  order_number: string;
  cycle_id: string;
  cycle_month: string;
  community_id: string;
  community_name: string;
  retailer_id: string;
  status: OrderStatus;
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

export interface RetailerOrderItemDetailDTO {
  id: string;
  variant_id: string;
  product_id: string;
  product_title: string;
  brand: string | null;
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

export interface RetailerOrderDetailDTO extends RetailerOrderSummaryDTO {
  items: RetailerOrderItemDetailDTO[];
  retailer_bill: RetailerBillDTO | null;
}

export interface InventoryItemDTO {
  id: string;
  retailer_id: string;
  variant_id: string;
  product_title: string;
  brand: string | null;
  variant_title: string;
  sku: string;
  pack_unit: string;
  current_stock_qty: number;
  reserved_stock_qty: number;
  available_stock_qty: number;
  reorder_level_qty: number;
  is_low_stock: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface InventoryMovementDTO {
  id: string;
  variant_id: string;
  product_title: string;
  variant_title: string;
  sku: string;
  movement_type: string;
  quantity_delta: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

// =============================================================================
// Admin & Platform DTOs
// =============================================================================

export interface AdminDashboardMetricsDTO {
  community_id: string;
  community_name: string;
  cycle_month: string;
  total_households: number;
  participating_households: number;
  total_billing_paise: number;
  amount_collected_paise: number;
  outstanding_paise: number;
  collection_percentage: number;
  deliveries_pending: number;
  deliveries_completed: number;
}

export interface AdminResidentInvoiceDTO {
  invoice_id: string;
  invoice_number: string;
  user_id: string;
  resident_name: string;
  phone: string;
  unit_number: string | null;
  total_amount_paise: number;
  paid_amount_paise: number;
  outstanding_paise: number;
  status: string;
  paid_at: string | null;
  last_reminded_at: string | null;
}

export interface ReminderDeliveryReportDTO {
  channel: NotificationChannel;
  status: "sent" | "failed" | "unconfigured";
  reason?: string;
}

export interface AdminHandoverItemDTO {
  handover_id: string;
  delivery_id: string;
  invoice_id: string;
  invoice_number: string;
  recipient_user_id: string;
  recipient_name: string;
  phone: string;
  unit_number: string | null;
  invoice_status: string;
  status: "pending" | "handed_over";
  handover_timestamp: string | null;
  handed_over_by_name: string | null;
  notes: string | null;
}

export interface AdminDeliveryStatusDTO {
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
  handovers: AdminHandoverItemDTO[];
}

export interface PlatformCommunityDTO {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  postal_code: string;
  is_active: boolean;
  members_count: number;
  mapped_retailer_name: string | null;
  created_at: string;
}

export interface PlatformRetailerDTO {
  id: string;
  user_id: string;
  owner_name: string;
  store_name: string;
  business_address: string;
  gstin: string | null;
  phone: string;
  status: string;
  mapped_communities_count: number;
  created_at: string;
}

export interface PlatformOverviewDTO {
  communities_count: number;
  active_communities_count: number;
  retailers_count: number;
  users_count: number;
  orders_count: number;
  gmv_paise: number;
  collected_paise: number;
  outstanding_paise: number;
  database_status: "connected";
}

export interface PlatformConfigDTO {
  cutoff_day: number;
  cutoff_hour: number;
  cutoff_minute: number;
  reminder_rate_limit_minutes: number;
}

export interface AuditLogDTO {
  id: string;
  user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  payload_after: string | null;
  created_at: string;
}

// =============================================================================
// Notifications & Voice DTOs
// =============================================================================

export interface NotificationItemDTO {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferenceDTO {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface VoiceClarificationOptionDTO {
  variant_id: string;
  product_id: string;
  product_title: string;
  variant_title: string;
  unit: string;
  price_paise: number;
  quantity: number;
}

export interface VoiceInterpretedItemDTO {
  heard: string;
  status: "matched" | "needs_clarification" | "ambiguous" | "unmatched";
  confidence: number;
  product_id: string | null;
  product_title: string | null;
  variant_id: string | null;
  variant_title: string | null;
  requested_quantity: number | null;
  requested_unit: string | null;
  pack_multiplier: number;
  unit_price_paise: number | null;
  estimated_total_paise: number | null;
  needs_clarification: boolean;
  clarification_question: string | null;
  clarification_options: VoiceClarificationOptionDTO[];
}

export interface VoiceInterpretResponseDTO {
  transcript: string;
  language: string;
  items: VoiceInterpretedItemDTO[];
  summary: {
    total_items: number;
    matched_count: number;
    clarification_needed_count: number;
    unmatched_count: number;
    estimated_total_paise: number;
  };
}

export type { BillingCalculationResult };
