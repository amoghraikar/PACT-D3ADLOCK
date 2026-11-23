"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Clock } from "lucide-react";

export interface NotificationItemPreview {
  id: string;
  title: string;
  message: string;
  kind?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationBellProps {
  unreadCount?: number;
  notifications?: NotificationItemPreview[];
  onMarkAllRead?: () => void;
  onNotificationClick?: (id: string) => void;
  className?: string;
}

export function NotificationBell({
  unreadCount = 0,
  notifications = [],
  onMarkAllRead,
  onNotificationClick,
  className = "",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative p-2.5 rounded-ctl text-text hover:bg-background border border-transparent hover:border-border transition-colors focus-ring cursor-pointer"
      >
        <Bell className="w-5 h-5 text-text" />

        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-danger-700 text-white text-[10px] font-bold rounded-pill flex items-center justify-center leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-card shadow-[var(--shadow-float)] z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-text text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary rounded-pill">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && onMarkAllRead && (
              <button
                type="button"
                onClick={() => {
                  onMarkAllRead();
                  setIsOpen(false);
                }}
                className="text-xs text-primary hover:text-primary-hover font-medium flex items-center gap-1 cursor-pointer focus-ring rounded"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No new notifications</p>
                <p className="text-xs mt-1">You are all caught up on community updates.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onNotificationClick?.(n.id);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 hover:bg-background/80 transition-colors cursor-pointer ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold ${!n.is_read ? "text-primary" : "text-text"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
