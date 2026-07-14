"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

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

  const brandMark = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
  ) : (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-black text-on-primary">
      🍔
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-muted md:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-3 px-6 py-5">
          {brandMark}
          <div>
            <p className="text-sm font-bold leading-tight text-text">{brand}</p>
            <p className="text-xs text-text-faint">CFD Hostel Treats</p>
          </div>
        </div>
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
                <Icon className="h-5 w-5" />
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
        <button
          onClick={logout}
          className="m-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-text-muted hover:bg-bg-muted"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-border bg-surface px-2 py-1.5 md:hidden">
        {items.slice(0, 6).map((it) => {
          const active = isActive(pathname, it);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[11px]",
                active ? "text-primary" : "text-text-faint",
              )}
            >
              <Icon className="h-6 w-6" />
              {it.label}
              {it.badge ? (
                <span className="absolute top-0 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
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
