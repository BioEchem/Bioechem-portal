"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Bell, BookOpen, BriefcaseBusiness, CheckCheck, Info } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  grade:           <BookOpen className="w-4 h-4" />,
  certificate:     <Award className="w-4 h-4" />,
  job_application: <BriefcaseBusiness className="w-4 h-4" />,
  announcement:    <Bell className="w-4 h-4" />,
  general:         <Info className="w-4 h-4" />,
};

const TYPE_COLOR: Record<string, string> = {
  grade:           "bg-blue-50 text-blue-600",
  certificate:     "bg-amber-50 text-amber-600",
  job_application: "bg-emerald-50 text-emerald-600",
  announcement:    "bg-purple-50 text-purple-600",
  general:         "bg-gray-100 text-gray-500",
};

export function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [markingAll, setMarkingAll] = useState(false);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className="py-16 text-center">
        <Bell className="mx-auto w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No notifications yet.</p>
        <p className="text-xs text-gray-400 mt-1">
          You&apos;ll be notified when assignments are graded, certificates are issued, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{unreadCount} unread</p>
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read
          </button>
        </div>
      )}

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        {notifications.map((n) => {
          const icon = TYPE_ICON[n.type] ?? TYPE_ICON.general;
          const color = TYPE_COLOR[n.type] ?? TYPE_COLOR.general;
          const content = (
            <div
              className={`flex gap-3 px-4 py-4 transition-colors ${
                n.read ? "bg-white" : "bg-blue-50/40"
              } hover:bg-gray-50`}
              onClick={() => !n.read && markRead(n.id)}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${n.read ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              )}
            </div>
          );

          return n.link ? (
            <Link key={n.id} href={n.link} className="block cursor-pointer">
              {content}
            </Link>
          ) : (
            <div key={n.id} className="cursor-pointer">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
