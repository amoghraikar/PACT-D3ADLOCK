/**
 * PACT Centralized Typed API Client.
 * Handles base URL configuration, Bearer token injection, request timeouts,
 * standard C6 error envelope parsing, and network failure resilience.
 */

import { ApiErrorPayload, ApiErrorResponse, RequestOptions } from "@/types/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || `API Error: ${payload.code || status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code || "UNKNOWN_ERROR";
    this.details = payload.details;
  }
}

export const TOKEN_STORAGE_KEY = "pact_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://pact-d3adlock.onrender.com/api/v1";
    }
  }
  return "http://localhost:8000/api/v1";
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    timeoutMs = 15000,
    requiresAuth = true,
    headers: customHeaders,
    body,
    ...restInit
  } = options;

  let url = path;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const base = getApiBaseUrl();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    url = `${base}${cleanPath}`;
  }

  const headers = new Headers(customHeaders);

  // Content-Type default
  if (!headers.has("Content-Type") && body && typeof body === "string") {
    headers.set("Content-Type", "application/json");
  }

  // Request ID for tracing
  if (!headers.has("X-Request-Id")) {
    headers.set("X-Request-Id", `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  }

  // Authentication interceptor
  if (requiresAuth && !headers.has("Authorization")) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Timeout handling via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...restInit,
      body,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 204 No Content
    if (response.status === 204) {
      return null as unknown as T;
    }

    if (!response.ok) {
      let errorPayload: ApiErrorPayload;
      try {
        const errorJson = (await response.json()) as ApiErrorResponse;
        if (errorJson && errorJson.error && typeof errorJson.error === "object") {
          errorPayload = errorJson.error;
        } else {
          errorPayload = {
            code: `HTTP_${response.status}`,
            message: response.statusText || `Request failed (${response.status})`,
          };
        }
      } catch {
        errorPayload = {
          code: `HTTP_${response.status}`,
          message: response.statusText || `Request failed (${response.status})`,
        };
      }

      // If 401 Unauthorized, notify/clear stale session
      if (response.status === 401 && typeof window !== "undefined") {
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent("pact:unauthorized"));
      }

      throw new ApiError(response.status, errorPayload);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, {
        code: "TIMEOUT_ERROR",
        message: `Request timed out after ${timeoutMs}ms. Please try again.`,
      });
    }

    const message = err instanceof Error ? err.message : "Network failure";
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Unable to connect to the PACT server. Please check your internet connection.",
      details: message,
    });
  }
}

export interface ApiClientFunction {
  <T>(path: string, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

const clientFn = (<T>(path: string, options?: RequestOptions): Promise<T> => {
  return request<T>(path, options);
}) as ApiClientFunction;

clientFn.get = <T>(path: string, options?: RequestOptions): Promise<T> => {
  return request<T>(path, { ...options, method: "GET" });
};

clientFn.post = <T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> => {
  const body = data !== undefined ? (typeof data === "string" ? data : JSON.stringify(data)) : undefined;
  return request<T>(path, { ...options, method: "POST", body });
};

clientFn.put = <T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> => {
  const body = data !== undefined ? (typeof data === "string" ? data : JSON.stringify(data)) : undefined;
  return request<T>(path, { ...options, method: "PUT", body });
};

clientFn.delete = <T>(path: string, options?: RequestOptions): Promise<T> => {
  return request<T>(path, { ...options, method: "DELETE" });
};

export const apiClient: ApiClientFunction = clientFn;
