"use client";

import { useEffect, useState } from "react";
import { Check, Package, ChefHat, Bike, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import type { Order } from "@/lib/types/models";
import type { OrderStatus } from "@/lib/domain/constants";

const STEPS: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "placed", label: "Placed", icon: Package },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "on_the_way", label: "Treat on the way ✈", icon: Bike },
  { key: "delivered", label: "Delivered", icon: PartyPopper },
];

export function OrderTracker({ initial }: { initial: Order }) {
  const [order, setOrder] = useState<Order>(initial);

  useEffect(() => {
    const supabase = createClient();
    // Realtime updates; falls back to polling if realtime is not enabled.
    const channel = supabase
      .channel(`order-${initial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${initial.id}` },
        (payload) => setOrder((o) => ({ ...o, ...(payload.new as Order) })),
      )
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", initial.id)
        .maybeSingle();
      if (data) setOrder(data as Order);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [initial.id]);

  const cancelled = order.order_status === "cancelled";
  const activeIdx = STEPS.findIndex((s) => s.key === order.order_status);

  return (
    <PageContainer max="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">{order.order_number}</h1>
        <Badge tone={order.payment_method === "cod" ? "warn" : "success"}>
          {order.payment_method === "cod" ? "COD" : "Pre-paid"}
        </Badge>
      </div>

      {cancelled ? (
        <Card>
          <CardBody className="text-center text-error">This order was cancelled.</CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <ol className="relative ml-3 border-l-2 border-border">
              {STEPS.map((step, i) => {
                const done = i <= activeIdx;
                const Icon = step.icon;
                return (
                  <li key={step.key} className="mb-6 ml-6 last:mb-0">
                    <span
                      className={cn(
                        "absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface",
                        done ? "bg-primary text-white" : "bg-border text-text-faint",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <p className={cn("font-semibold", done ? "text-text" : "text-text-faint")}>
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardBody>
        </Card>
      )}

      <Card className="mt-4">
        <CardBody>
          <p className="mb-2 text-sm font-semibold text-text-muted">Items</p>
          {order.order_items?.map((it) => (
            <div key={it.id} className="flex justify-between py-1 text-sm">
              <span>
                {it.name} × {it.quantity}
              </span>
              <span className="font-medium">{money(it.total_price)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-extrabold">
            <span>Total</span>
            <span className="text-success">{money(order.total)}</span>
          </div>
          <p className="mt-2 text-sm text-text-muted">
            Deliver to Room {order.room_number}, {order.block} Block
          </p>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
