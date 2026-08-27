"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/domain/constants";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import Image from "next/image";
import type { Order, Campus } from "@/lib/types/models";

export function AdminOrders({ orders, campuses = [] }: { orders: Order[]; campuses?: Campus[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  // Auto-refresh every 6 seconds to fetch newly placed orders live for Admin
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 6000);
    return () => clearInterval(timer);
  }, [router]);

  const filters = ["all", ...ORDER_STATUSES];
  const visible = orders.filter(
    (o) =>
      (filter === "all" || o.order_status === filter) &&
      (campusFilter === "all" || o.campus_id === campusFilter)
  );

  async function act(order: Order, action: "deliver" | "cancel") {
    setBusy(order.id);
    const supabase = createClient();
    if (action === "deliver") {
      await supabase.rpc("mark_delivered", { p_order_id: order.id });
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [order.customer_id],
          title: "Order Delivered 🎉",
          message: `Your order #${order.order_number} has been delivered!`,
          url: `/track/${order.id}`
        })
      }).catch(() => {});
    } else {
      await supabase.from("orders").update({ order_status: "cancelled" }).eq("id", order.id);
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [order.customer_id],
          title: "Order Cancelled ❌",
          message: `Your order #${order.order_number} was cancelled.`,
          url: `/track/${order.id}`
        })
      }).catch(() => {});
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <PageContainer>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-text">Orders</h1>
        {campuses && campuses.length > 0 && (
          <Select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="all">All Campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm capitalize",
              filter === f ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text-muted",
            )}
          >
            {f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-text-faint">No orders.</p>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => {
            const done = o.order_status === "delivered" || o.order_status === "cancelled";
            return (
              <Card key={o.id}>
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text">{o.order_number}</span>
                    <Badge tone={o.order_status === "delivered" ? "success" : o.order_status === "cancelled" ? "error" : "primary"}>
                      {o.order_status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    Room {o.room_number}, {o.block} · {o.payment_method.toUpperCase()} ·{" "}
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm flex items-center gap-1.5">
                    <span className="font-semibold text-text">{o.profiles?.full_name || "Unknown Customer"}</span>
                    {o.profiles?.phone && (
                      <>
                        <span className="text-text-muted">·</span>
                        <a href={`tel:${o.profiles.phone}`} className="text-primary hover:underline font-medium">
                          {o.profiles.phone}
                        </a>
                      </>
                    )}
                  </p>
                  {o.campuses && (
                    <p className="mt-0.5 text-xs font-semibold text-accent-warm">
                      {o.campuses.name} {o.campuses.gender ? `(${o.campuses.gender} Hostel)` : ""}
                    </p>
                  )}
                  {o.rating && (
                    <div className="mt-2 rounded-lg bg-surface/50 border border-border p-2">
                      <div className="flex items-center gap-1 text-primary">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={cn("h-3 w-3", i < o.rating! ? "fill-primary" : "text-border")} />
                        ))}
                      </div>
                      {o.feedback && <p className="mt-1 text-xs text-text-muted italic">"{o.feedback}"</p>}
                    </div>
                  )}
                  {o.payment_screenshot_url && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-text-muted mb-1">Payment Screenshot:</p>
                      <a href={o.payment_screenshot_url} target="_blank" rel="noopener noreferrer" className="block relative h-32 w-24 rounded-lg overflow-hidden border border-border">
                        <Image src={o.payment_screenshot_url} alt="Payment" fill className="object-cover" />
                      </a>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold text-primary">{money(o.total)}</span>
                    {!done && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => act(o, "cancel")}>
                          Cancel
                        </Button>
                        <Button size="sm" variant="success" loading={busy === o.id} onClick={() => act(o, "deliver")}>
                          Mark delivered
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
