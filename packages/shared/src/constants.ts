export const ROLES = {
  CUSTOMER: "customer",
  RETAILER: "retailer",
  COMMUNITY_ADMIN: "community_admin",
  PLATFORM_ADMIN: "platform_admin",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const CYCLE_STATUSES = {
  OPEN: "OPEN",
  LOCKED: "LOCKED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
} as const;

export type CycleStatus = (typeof CYCLE_STATUSES)[keyof typeof CYCLE_STATUSES];

export const ORDER_STATUSES = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  PACKING: "PACKING",
  BILLED: "BILLED",
  DISPATCHED: "DISPATCHED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const INVOICE_STATUSES = {
  UNPAID: "unpaid",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  NEEDS_REFUND: "needs_refund",
  VOID: "void",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

export const OUTBOX_EVENTS = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_ACCEPTED: "ORDER_ACCEPTED",
  ORDER_PACKED: "ORDER_PACKED",
  BILL_FINALISED: "BILL_FINALISED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  DELIVERY_READY: "DELIVERY_READY",
  DELIVERY_COMPLETED: "DELIVERY_COMPLETED",
  REFUND_PROCESSED: "REFUND_PROCESSED",
} as const;

export type OutboxEventType = (typeof OUTBOX_EVENTS)[keyof typeof OUTBOX_EVENTS];

export const NOTIFICATION_CHANNELS = ["in_app", "sms", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const BUSINESS_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
