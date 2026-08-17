"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star, MessageSquareText } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Badge, EmptyState } from "@/components/ui/misc";
import { PushPrompt } from "@/components/push-prompt";
import { cn } from "@/lib/utils";
import type { Campus, Order } from "@/lib/types/models";

type Filter = "all" | "pending" | "delivered";

export function ManagerOrders({
  orders,
}: {
  orders: Order[];
  campus?: Campus | null;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

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
      <PushPrompt isManager />
      <h1 className="text-2xl font-extrabold text-text">Today&apos;s Orders</h1>
      <p className="mb-4 text-sm text-text-muted">Sorted by block & room for routing</p>

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
                    {o.rating && (
                      <div className="flex items-center ml-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="ml-1 text-sm font-bold text-text">{o.rating}</span>
                      </div>
                    )}
                  </div>
                  {o.additional_note && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warn">
                      <MessageSquareText className="h-3.5 w-3.5" /> Note attached
                    </div>
                  )}
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
