"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Badge, Switch, EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { Campus, Order } from "@/lib/types/models";

type Filter = "all" | "pending" | "delivered";

export function ManagerOrders({
  orders,
  campus,
}: {
  orders: Order[];
  campus?: Campus | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [shiftActive, setShiftActive] = useState(campus?.shift_active ?? true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (campus?.shift_active !== undefined) {
      setShiftActive(campus.shift_active);
    }
  }, [campus?.shift_active]);

  async function toggleShift(v: boolean) {
    setToggling(true);
    setShiftActive(v);
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: campus?.id, shiftActive: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update shift");
      router.refresh();
    } catch (e) {
      setShiftActive(!v);
    } finally {
      setToggling(false);
    }
  }

  // Auto-refresh every 6 seconds to fetch newly placed orders live
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 6000);
    return () => clearInterval(timer);
  }, [router]);

  // Sort by block then numeric room for an efficient delivery route.
  const sorted = [...orders].sort((a, b) => {
    if (a.block !== b.block) return a.block.localeCompare(b.block);
    return (parseInt(a.room_number) || 0) - (parseInt(b.room_number) || 0);
  });

  const visible = sorted.filter((o) => {
    if (filter === "pending")
      return o.order_status !== "delivered" && o.order_status !== "cancelled";
    if (filter === "delivered") return o.order_status === "delivered";
    return true;
  });

  return (
    <PageContainer max="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-text">Today&apos;s Orders</h1>
      <p className="mb-4 text-sm text-text-muted">Sorted by block & room for routing</p>

      {campus && (
        <div
          className={cn(
            "mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
            shiftActive
              ? "border-success/40 bg-success/5"
              : "border-error/40 bg-error/5",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl font-bold",
                shiftActive ? "bg-success/20 text-success" : "bg-error/20 text-error",
              )}
            >
              <Power className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold text-text">
                {shiftActive ? "Live Shift is OPEN" : "ALL FINISHED FOR TODAY"}
              </p>
              <p className="text-xs text-text-muted">
                {shiftActive
                  ? "Customers can place orders now"
                  : "Ordering is closed for today"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={shiftActive ? "success" : "error"}>
              {shiftActive ? "OPEN" : "FINISHED"}
            </Badge>
            <Switch checked={shiftActive} onChange={toggleShift} disabled={toggling} />
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "delivered"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm capitalize",
              filter === f
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-text-muted",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No orders" />
      ) : (
        <div className="space-y-3">
          {visible.map((o) => {
            const pending =
              o.order_status !== "delivered" && o.order_status !== "cancelled";
            return (
              <Link
                key={o.id}
                href={`/manager/orders/${o.id}`}
                className={cn(
                  "flex items-center justify-between rounded-2xl border bg-surface p-4 transition-colors hover:bg-bg-muted",
                  pending ? "border-primary/40" : "border-border",
                )}
              >
                <div>
                  <p className="font-bold text-text">
                    Room {o.room_number}, {o.block}
                  </p>
                  <p className="text-sm text-text-muted">{o.order_number}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge tone={o.payment_method === "cod" ? "warn" : "success"}>
                      {o.payment_method === "cod" ? "COD" : "Paid"}
                    </Badge>
                    <Badge
                      tone={o.order_status === "delivered" ? "success" : "primary"}
                    >
                      {o.order_status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text-faint" />
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
