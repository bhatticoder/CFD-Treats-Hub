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
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/managers", label: "Managers", icon: Users },
  { href: "/admin/campuses", label: "Campuses", icon: Building2 },
  { href: "/admin/discounts", label: "Discounts", icon: Tag },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: GraduationCap },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/branding", label: "Branding", icon: Palette },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell items={items} brand="Admin Panel">
      {children}
    </AppShell>
  );
}
