"use client";

import { useEffect, useState } from "react";
import { subscribeToPushNotifications } from "@/lib/push";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

export function PushPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if push is supported and permission is default (not granted or denied)
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Also check if user dismissed it previously in local storage
        const dismissed = localStorage.getItem("push_dismissed");
        if (!dismissed) {
          setShow(true);
        }
      }
    }
  }, []);

  const handleEnable = async () => {
    const success = await subscribeToPushNotifications();
    if (success || Notification.permission !== "default") {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("push_dismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-6 rounded-2xl bg-accent-warm/10 p-4 border border-accent-warm/20 flex flex-col sm:flex-row items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-warm text-white">
        <BellRing className="h-5 w-5" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-extrabold text-accent-warm text-sm">Never miss an order</h3>
        <p className="text-xs font-medium text-text mt-0.5">
          Enable notifications to get live updates on orders.
        </p>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button variant="outline" className="flex-1 sm:flex-none h-9 text-xs" onClick={handleDismiss}>
          Not now
        </Button>
        <Button className="flex-1 sm:flex-none h-9 text-xs bg-accent-warm hover:bg-accent-warm/90 text-white" onClick={handleEnable}>
          Enable
        </Button>
      </div>
    </div>
  );
}
