"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, Button, StatusPill, Skeleton, EmptyState } from "@/components/ui";
import { notificationsService, NotificationItem } from "@/services/notifications.service";
import { useToast } from "@/hooks/useToast";
import { Bell, ArrowLeft, Send, CheckCircle2, MessageSquare } from "lucide-react";

export default function AdminNotificationsPage() {
  const { error: toastError } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      try {
        const res = await notificationsService.getNotifications({ limit: 40 });
        setNotifications(res || []);
      } catch (err: any) {
        toastError(err?.message || "Failed to load notifications");
      } finally {
        setIsLoading(false);
      }
    }
    loadNotifications();
  }, [toastError]);

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin"
                className="text-xs font-semibold text-muted hover:text-text inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Overview</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-text">
              Community Alert History
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Broadcast logs for cycle cutoffs, payment reminders, and gate deliveries
            </p>
          </div>
        </div>

        {/* Notifications Feed */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No Broadcasts Recorded"
            description="System notifications will automatically log here as shopping cycle events occur."
          />
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text">{n.title}</h3>
                    <span className="text-[10px] text-muted">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{n.body}</p>
                  <span className="inline-block text-[10px] text-primary font-semibold mt-1">
                    Channel: {n.channel.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
