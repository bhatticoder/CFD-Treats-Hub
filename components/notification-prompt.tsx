"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "cfd_notif_dismissed";

/** First-visit prompt asking the customer to allow browser notifications. */
export function NotificationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return; // already granted/denied
    if (localStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);

  async function enable() {
    try {
      await Notification.requestPermission();
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-xl md:inset-x-auto md:right-4 md:left-auto">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-text">
            Enable the notifications for this website so you don&apos;t miss out
            on timely Regular Updates!
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={enable}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover"
            >
              Enable
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-bg-muted"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="text-text-faint">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
