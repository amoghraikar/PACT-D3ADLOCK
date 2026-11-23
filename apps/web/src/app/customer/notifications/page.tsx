"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState } from "@/components/ui";
import {
  notificationsService,
  NotificationItem,
  NotificationPreferences,
} from "@/services/notifications.service";
import { useToast } from "@/hooks/useToast";
import { Bell, CheckCircle2, MessageSquare, Phone, Smartphone, Check } from "lucide-react";

export default function CustomerNotificationsPage() {
  const { success, error: toastError, info } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    in_app_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notifs, prefs] = await Promise.allSettled([
        notificationsService.getNotifications({ limit: 30 }),
        notificationsService.getPreferences(),
      ]);

      if (notifs.status === "fulfilled") setNotifications(notifs.value || []);
      if (prefs.status === "fulfilled") setPreferences(prefs.value);
    } catch (err: any) {
      toastError(err?.message || "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [notifs, prefs] = await Promise.allSettled([
          notificationsService.getNotifications({ limit: 30 }),
          notificationsService.getPreferences(),
        ]);

        if (!ignore) {
          if (notifs.status === "fulfilled") setNotifications(notifs.value || []);
          if (prefs.status === "fulfilled") setPreferences(prefs.value);
        }
      } catch (err: any) {
        if (!ignore) toastError(err?.message || "Failed to load notifications");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [toastError]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      info("Marked as read");
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      success("All notifications marked as read");
    } catch (err: any) {
      toastError(err?.message || "Failed to mark all as read");
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setIsUpdatingPrefs(true);
    try {
      await notificationsService.updatePreferences(updated);
      success("Notification preferences updated");
    } catch (err: any) {
      toastError(err?.message || "Failed to update preferences");
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Notifications & Alerts
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Cycle cutoffs, delivery handovers, and payment reminder updates
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={notifications.every((n) => n.is_read)}
            className="h-9"
          >
            <Check className="w-4 h-4 mr-1.5" />
            <span>Mark All as Read</span>
          </Button>
        </div>

        {/* Channel Preferences Panel */}
        <Card className="p-5 space-y-3 bg-surface border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Delivery Channel Preferences
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleTogglePreference("in_app_enabled")}
              disabled={isUpdatingPrefs}
              className={`p-3 rounded-card border transition-colors flex items-center justify-between cursor-pointer ${
                preferences.in_app_enabled
                  ? "bg-background border-primary text-text"
                  : "bg-surface border-border text-muted"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Smartphone className="w-4 h-4 text-primary" />
                <span className="font-semibold">In-App Notifications</span>
              </div>
              <span className="text-[10px] font-bold">
                {preferences.in_app_enabled ? "ON" : "OFF"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTogglePreference("sms_enabled")}
              disabled={isUpdatingPrefs}
              className={`p-3 rounded-card border transition-colors flex items-center justify-between cursor-pointer ${
                preferences.sms_enabled
                  ? "bg-background border-primary text-text"
                  : "bg-surface border-border text-muted"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-semibold">SMS Reminders</span>
              </div>
              <span className="text-[10px] font-bold">{preferences.sms_enabled ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTogglePreference("whatsapp_enabled")}
              disabled={isUpdatingPrefs}
              className={`p-3 rounded-card border transition-colors flex items-center justify-between cursor-pointer ${
                preferences.whatsapp_enabled
                  ? "bg-background border-primary text-text"
                  : "bg-surface border-border text-muted"
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-semibold">WhatsApp Alerts</span>
              </div>
              <span className="text-[10px] font-bold">
                {preferences.whatsapp_enabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </Card>

        {/* Notifications Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="You are completely caught up! We will alert you when cutoff countdowns start or when bulk deliveries arrive at the gate."
          />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  n.is_read ? "bg-surface" : "bg-background/80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      n.is_read ? "bg-border text-muted" : "bg-primary text-white"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm ${n.is_read ? "font-normal text-text" : "font-bold text-text"}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">{n.body}</p>
                    <span className="text-[10px] text-muted block mt-1">
                      {new Date(n.created_at).toLocaleString()} · via {n.channel}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(n.id)}
                    className="text-xs text-primary hover:underline font-semibold shrink-0 cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
