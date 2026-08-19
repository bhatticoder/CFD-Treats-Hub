// Build: 2026-08-14T18:21Z — force fresh deploy
"use client";

import {
  LayoutDashboard,
  Package,
  ReceiptText,
  Users,
  Building2,
  Tag,
  ScrollText,
  BarChart3,
  GraduationCap,
  Palette,
  Store,
  ClipboardList,
  Power,
  Ticket,
  Calculator,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/shift", label: "Shift Control", icon: Power },
  { href: "/admin/preorders", label: "Pre-orders", icon: ClipboardList },
  { href: "/admin/restaurants", label: "Restaurants", icon: Store },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/managers", label: "Managers", icon: Users },
  { href: "/admin/campuses", label: "Campuses", icon: Building2 },
  { href: "/admin/charges", label: "Charges", icon: Calculator },
  { href: "/admin/discounts", label: "Discounts", icon: Tag },
  { href: "/admin/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: GraduationCap },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/branding", label: "Branding", icon: Palette },
];

export function AdminShell({
  children,
  logoUrl,
  themeColor,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  return (
    <AppShell items={items} brand="Admin Panel" logoUrl={logoUrl} themeColor={themeColor}>
      {children}
    </AppShell>
  );
}
