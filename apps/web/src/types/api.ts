export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  requiresAuth?: boolean;
}
