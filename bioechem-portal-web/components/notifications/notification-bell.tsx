"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);

  async function fetchUnread() {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (!res.ok) return;
      const json = await res.json() as { data: unknown[] };
      setUnread((json.data ?? []).length);
    } catch {
      // ignore network errors
    }
  }

  useEffect(() => {
    fetchUnread();
    // Poll every 60 seconds
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
