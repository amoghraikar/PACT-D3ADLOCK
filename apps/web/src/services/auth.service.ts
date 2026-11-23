import { apiClient, setAuthToken } from "./api-client";
import { AuthTokenResponse, OtpRequestResponse, UserSummary } from "@/types/auth";

export const authService = {
  async requestOtp(phone: string): Promise<OtpRequestResponse> {
    return apiClient.post<OtpRequestResponse>("/auth/request-otp", { phone }, { requiresAuth: false });
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>(
      "/auth/verify-otp",
      { phone, otp },
      { requiresAuth: false }
    );
    if (response?.access_token) {
      setAuthToken(response.access_token);
    }
    return response;
  },

  async getCurrentUser(): Promise<UserSummary> {
    return apiClient.get<UserSummary>("/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      setAuthToken(null);
    }
  },
};
