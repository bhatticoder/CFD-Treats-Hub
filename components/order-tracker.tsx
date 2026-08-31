"use client";

import { useEffect, useState } from "react";
import { Check, Package, ChefHat, Bike, PartyPopper, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    if (order.order_status === "delivered" && !order.rating && !hasRated) {
      setShowRating(true);
    }
  }, [order.order_status, order.rating, hasRated]);

  async function submitRating() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/order/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, rating, feedback }),
      });
      if (res.ok) {
        setHasRated(true);
        setShowRating(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    const supabase = createClient();
    // Realtime updates; falls back to polling if realtime is not enabled.
    const channel = supabase
      .channel(`order-${initial.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${initial.id}` },
        (payload: any) => setOrder((o) => ({ ...o, ...(payload.new as Order) })),
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
    <>
    <PageContainer max="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">{order.order_number}</h1>
        <Badge tone={order.payment_method === "cod" ? "warn" : "success"}>
          {order.payment_method === "cod" ? "COD" : "Pre-paid"}
        </Badge>
      </div>

      {cancelled ? (
        <Card className="border-error/20 bg-error/5">
          <CardBody className="text-center">
            <h2 className="text-lg font-bold text-error mb-1">Order Cancelled</h2>
            <p className="text-sm font-medium text-error/80">
              {order.cancel_reason ? `Reason: ${order.cancel_reason}` : "This order was cancelled."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {order.order_status !== "delivered" && !order.is_preorder && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
              <h2 className="text-base font-extrabold text-primary">
                Your Treats will be here in 5-30 mins depending on distance and traffic.
              </h2>
              <p className="text-xs font-medium text-primary/80 mt-1">
                It may rarely exceed the time during very high traffic or rush at oven.
              </p>
            </div>
          )}
          {order.order_status !== "delivered" && order.is_preorder && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
              <h2 className="text-base font-extrabold text-primary">
                Your Pre-order is confirmed!
              </h2>
              <p className="text-xs font-medium text-primary/80 mt-1">
                We will prepare it for the scheduled delivery time.
              </p>
            </div>
          )}
          {order.room_number?.startsWith("Pickup: ") && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
              <p className="font-bold">Self-Pickup Required</p>
              <p className="text-sm mt-1 text-text">
                Please collect your order from <strong>{order.room_number.replace("Pickup: ", "")}</strong> once it is ready.
              </p>
            </div>
          )}
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
        </>
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
            {order.room_number.startsWith("Pickup:") ? (
              <span className="font-bold text-accent-warm">{order.room_number}</span>
            ) : (
              `Deliver to Room ${order.room_number}, ${order.block} Block`
            )}
          </p>
        </CardBody>
      </Card>
    </PageContainer>
      <Modal open={showRating} onClose={() => setShowRating(false)} title="Help us improve our service!">
        <div className="flex flex-col items-center">
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    rating >= star ? "fill-primary text-primary" : "text-border"
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
            placeholder="Your satisfaction is our priority!"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <Button
            className="w-full mt-5"
            disabled={rating === 0 || submitting}
            loading={submitting}
            onClick={submitRating}
          >
            Submit Feedback
          </Button>
        </div>
      </Modal>
    </>
  );
}
