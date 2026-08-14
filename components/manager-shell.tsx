"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Power, Tag, Megaphone } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

const DEVICE_KEY = "cfd_manager_device_id";

export function ManagerShell({
  children,
  logoUrl,
  themeColor,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const router = useRouter();

  // Single-device login enforcement (Brief §2.1): claim this device, then poll.
  useEffect(() => {
    const supabase = createClient();
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, deviceId);
    }
    supabase.rpc("register_manager_device", { p_device_id: deviceId });

    const timer = setInterval(async () => {
      const { data } = await supabase.rpc("is_active_device", {
        p_device_id: deviceId,
      });
      if (data === false) {
        clearInterval(timer);
        await supabase.auth.signOut();
        router.push("/login?reason=another-device");
        router.refresh();
      }
    }, 20000);

    return () => clearInterval(timer);
  }, [router]);

  const items: NavItem[] = [
    { href: "/manager", label: "Today's Orders", icon: ClipboardList, exact: true },
    { href: "/manager/discounts", label: "Discounts", icon: Tag },
    { href: "/manager/notify", label: "Notify", icon: Megaphone },
    { href: "/manager/end-shift", label: "Shift Control", icon: Power },
  ];

  return (
    <AppShell items={items} brand="Partner" logoUrl={logoUrl} themeColor={themeColor}>
      {children}
    </AppShell>
  );
}
