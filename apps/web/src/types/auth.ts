export type UserRole = "customer" | "retailer" | "admin" | "platform_admin";

export interface CommunityBrief {
  id: string;
  name: string;
  code: string;
  city?: string;
}

export interface UserSummary {
  id: string;
  phone: string;
  full_name?: string | null;
  email?: string | null;
  role: UserRole;
  is_active: boolean;
  community?: CommunityBrief | null;
  apartment_number?: string | null;
  building_name?: string | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserSummary;
}

export interface OtpRequestPayload {
  phone: string;
}

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  phone: string;
  dev_otp?: string;
  expires_in_seconds: number;
}

export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}
