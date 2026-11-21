"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Receipt, ShoppingBag, AlertCircle, CheckCircle2 } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    link?: string;
    invoice_id?: string;
    order_id?: string;
  };
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Backend offline or dev mode
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling per P15
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
    setIsOpen(false);
    if (link) {
      router.push(link);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/v1/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "bill_ready":
        return <Receipt className="w-4 h-4 text-teal-700" />;
      case "payment_succeeded":
        return <CheckCircle2 className="w-4 h-4 text-success-700" />;
      case "order_received":
      case "order_submitted":
        return <ShoppingBag className="w-4 h-4 text-ink-700" />;
      case "payment_failed":
      case "order_rejected":
      case "low_stock":
        return <AlertCircle className="w-4 h-4 text-danger-700" />;
      default:
        return <Bell className="w-4 h-4 text-ink-600" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        className="relative p-2 rounded-full bg-white border border-ice-300 text-ink-700 hover:bg-ice-100 transition-colors focus-ring cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-700 text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-card shadow-float border border-ice-300 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2 border-b border-ice-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-ink-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-ice-200 text-ink-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-teal-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-ice-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-ink-500 text-xs">
                <Bell className="w-6 h-6 text-ink-300 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-[11px] text-ink-400 mt-0.5">We will notify you when your monthly bill is ready.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.data?.link)}
                  className={`p-3 text-left transition-colors cursor-pointer flex items-start gap-3 hover:bg-ice-50 ${
                    !n.is_read ? "bg-ice-100/60 font-medium" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-ctl bg-white border border-ice-200">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-ink-800 truncate">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-700 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink-600 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
