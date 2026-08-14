"use client";

import { ClipboardList, Power, Tag, Megaphone } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

export function ManagerShell({
  children,
  logoUrl,
  themeColor,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
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
