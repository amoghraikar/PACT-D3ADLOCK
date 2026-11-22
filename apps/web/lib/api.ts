export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message || `API error (${error.code || status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = error.code || "UNKNOWN_ERROR";
    this.details = error.details;
  }
}

export async function apiClient<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : path.startsWith("/") ? path : `/${path}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      let errorData: ApiErrorPayload;
      try {
        const data = (await response.json()) as ApiErrorResponse;
        if (data && data.error && typeof data.error === "object") {
          errorData = data.error;
        } else {
          errorData = {
            code: `HTTP_${response.status}`,
            message: response.statusText || `Request failed with status ${response.status}`,
          };
        }
      } catch {
        errorData = {
          code: `HTTP_${response.status}`,
          message: response.statusText || `Request failed with status ${response.status}`,
        };
      }

      console.warn(
        `[PACT API] ${init?.method || "GET"} ${url} → ${response.status} (${duration}ms):`,
        errorData
      );

      throw new ApiError(response.status, errorData);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as unknown as T;
    }

    return response.json() as Promise<T>;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    const duration = Date.now() - startTime;
    console.error(`[PACT Network] Network error requesting ${url} (${duration}ms):`, err);

    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Unable to reach server. Please check your network connection.",
      details: err?.message,
    });
  }
}
