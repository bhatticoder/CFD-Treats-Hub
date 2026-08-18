"use client";

import { Home, ShoppingCart, ReceiptText, Bell, User, CalendarClock } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { useCart } from "@/lib/store/cart";
import { useEffect, useState } from "react";

export function CustomerShell({
  children,
  logoUrl,
  themeColor,
}: {
  children: React.ReactNode;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const count = mounted ? lines.reduce((n, l) => n + l.quantity, 0) : 0;

  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Home, exact: true },
    { href: "/preorder", label: "Pre-order", icon: CalendarClock },
    { href: "/cart", label: "Cart", icon: ShoppingCart, badge: count || undefined },
    { href: "/orders", label: "Orders", icon: ReceiptText },
    { href: "/notifications", label: "Alerts", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <AppShell items={items} brand="CFD Treats Hub" logoUrl={logoUrl} themeColor={themeColor} cartCount={count || undefined}>
      {children}
    </AppShell>
  );
}
