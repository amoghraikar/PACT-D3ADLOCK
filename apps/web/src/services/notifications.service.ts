import { apiClient } from "./api-client";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  notification_type: string;
  channel: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  in_app_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
}

export const notificationsService = {
  async getNotifications(params?: {
    limit?: number;
    unread_only?: boolean;
  }): Promise<NotificationItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.unread_only) searchParams.set("unread_only", "true");
    const qs = searchParams.toString();
    return apiClient.get<NotificationItem[]>(`/api/v1/notifications${qs ? `?${qs}` : ""}`);
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    return apiClient.get<{ unread_count: number }>("/api/v1/notifications/unread-count");
  },

  async markAsRead(notificationId: string): Promise<any> {
    return apiClient.post(`/api/v1/notifications/${notificationId}/read`, {});
  },

  async markAllAsRead(): Promise<any> {
    return apiClient.post("/api/v1/notifications/read-all", {});
  },

  async getPreferences(): Promise<NotificationPreferences> {
    return apiClient.get<NotificationPreferences>("/api/v1/notifications/preferences");
  },

  async updatePreferences(payload: NotificationPreferences): Promise<NotificationPreferences> {
    return apiClient.put<NotificationPreferences>("/api/v1/notifications/preferences", payload);
  },
};
