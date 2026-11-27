export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code || "API_ERROR";
    this.details = payload.details;
  }
}

const TOKEN_KEY = "pact_session_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function resolveApiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  const normalizedBase =
    base && !base.startsWith("http://") && !base.startsWith("https://")
      ? `https://${base}`
      : base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${cleanPath}` : cleanPath;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...rest } = init;
  const headers = new Headers(customHeaders);

  if (!headers.has("Content-Type") && rest.body && typeof rest.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth && !headers.has("Authorization")) {
    const token = getStoredToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(resolveApiUrl(path), {
      ...rest,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { message: text };
      }
    }

    if (!res.ok) {
      const errObj = (parsed as { error?: ApiErrorPayload })?.error;
      if (res.status === 401 && !path.includes("/auth/")) {
        setStoredToken(null);
      }
      throw new ApiError(res.status, {
        code: errObj?.code || `HTTP_${res.status}`,
        message: errObj?.message || res.statusText || "Request failed",
        details: errObj?.details,
      });
    }

    return parsed as T;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, { code: "TIMEOUT", message: "Request timed out" });
    }
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network connection failed",
    });
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestInit & { skipAuth?: boolean }) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestInit & { skipAuth?: boolean }) =>
    apiRequest<T>(path, {
      ...opts,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, opts?: RequestInit & { skipAuth?: boolean }) =>
    apiRequest<T>(path, {
      ...opts,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, opts?: RequestInit & { skipAuth?: boolean }) =>
    apiRequest<T>(path, {
      ...opts,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, opts?: RequestInit & { skipAuth?: boolean }) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
