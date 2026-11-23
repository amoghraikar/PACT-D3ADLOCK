import { apiClient } from "./api-client";

export interface CreatePaymentOrderResponse {
  order_id: string;
  invoice_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  customer_phone: string;
  customer_name: string;
}

export interface VerifyPaymentPayload {
  invoice_id: string;
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
}

export interface PaymentVerificationResponse {
  payment_record_id: string;
  invoice_id: string;
  amount_paise: number;
  status: string;
  transaction_id: string | null;
  is_duplicate: boolean;
  invoice_status: string;
  recorded_at: string;
}

export interface PaymentHistoryItem {
  id: string;
  invoice_id: string;
  amount_paise: number;
  currency: string;
  status: string;
  gateway: string;
  gateway_order_id: string;
  gateway_payment_id: string | null;
  error_code: string | null;
  error_description: string | null;
  recorded_at: string;
}

export const paymentsService = {
  async createOrder(invoiceId: string): Promise<CreatePaymentOrderResponse> {
    return apiClient.post<CreatePaymentOrderResponse>("/api/v1/payments/orders/create", {
      invoice_id: invoiceId,
    });
  },

  async verifyPayment(payload: VerifyPaymentPayload): Promise<PaymentVerificationResponse> {
    return apiClient.post<PaymentVerificationResponse>("/api/v1/payments/verify", payload);
  },

  async getInvoicePaymentHistory(invoiceId: string): Promise<PaymentHistoryItem[]> {
    return apiClient.get<PaymentHistoryItem[]>(`/api/v1/payments/invoices/${invoiceId}/history`);
  },
};
