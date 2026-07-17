"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, X } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exact?: boolean;
}

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function AppShell({
  items,
  brand,
  children,
  logoUrl,
  themeColor,
}: {
  items: NavItem[];
  brand: string;
  children: React.ReactNode;
  logoUrl?: string | null;
  themeColor?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => setDrawerOpen(false), [pathname]);

  // Apply the campus's configured theme colour live (Brief §5.4).
  React.useEffect(() => {
    if (themeColor && /^#[0-9a-fA-F]{6}$/.test(themeColor)) {
      document.documentElement.style.setProperty("--primary", themeColor);
      document.documentElement.style.setProperty("--primary-hover", themeColor);
    }
    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--primary-hover");
    };
  }, [themeColor]);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const brandMark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl || "/logo.png"}
      alt=""
      className="h-16 w-16 rounded-xl object-contain"
    />
  );

  const navLinks = (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((it) => {
        const active = isActive(pathname, it);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
              active
                ? "bg-primary-soft font-semibold text-primary"
                : "text-text hover:bg-bg-muted",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{it.label}</span>
            {it.badge ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary">
                {it.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const brandHeader = (
    <div className="flex items-center gap-3 px-6 py-5">
      {brandMark}
      <div>
        <p className="text-sm font-bold leading-tight text-text">{brand}</p>
        <p className="text-xs text-text-faint">CFD Hostel Treats</p>
      </div>
    </div>
  );

  const logoutBtn = (
    <button
      onClick={logout}
      className="m-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-text-muted hover:bg-bg-muted"
    >
      <LogOut className="h-5 w-5" />
      Logout
    </button>
  );

  return (
    <div className="min-h-screen bg-bg-muted md:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {brandHeader}
        {navLinks}
        {logoutBtn}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl || "/logo.png"} alt="" className="h-12 w-12 rounded-lg object-contain" />
          <p className="flex-1 font-bold text-text">{brand}</p>
          <button
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl text-text hover:bg-bg-muted"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Drawer (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-2">
              {brandHeader}
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl text-text-muted hover:bg-bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{navLinks}</div>
            {logoutBtn}
          </div>
        </div>
      )}
    </div>
  );
}

/** Constrains page content to a comfortable max width. */
export function PageContainer({
  children,
  className,
  max = "max-w-6xl",
}: {
  children: React.ReactNode;
  className?: string;
  max?: string;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 md:px-8", max, className)}>
      {children}
    </div>
  );
}
