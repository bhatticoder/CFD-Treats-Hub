"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info, Star, MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { Order } from "@/lib/types/models";

export function ManagerOrderDetail({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const delivered = order.order_status === "delivered" || order.order_status === "cancelled";

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const updatePayload: any = { order_status: status };
    if (status === "cancelled" && cancelReason.trim()) {
      updatePayload.cancel_reason = cancelReason.trim();
    }

    const { error } =
      status === "delivered"
        ? await supabase.rpc("mark_delivered", { p_order_id: order.id })
        : status === "cancelled"
        ? await supabase.rpc("manager_cancel_order", { p_order_id: order.id, p_reason: cancelReason.trim() || null })
        : await supabase.from("orders").update(updatePayload).eq("id", order.id);

    if (status === "cancelled") {
      // Send push notification just like Admin does
      fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [order.customer_id],
          title: "Order Cancelled ❌",
          message: cancelReason.trim() 
            ? `Your order #${order.order_number} was cancelled. Reason: ${cancelReason.trim()}`
            : `Your order #${order.order_number} was cancelled.`,
          url: `/track/${order.id}`
        })
      }).catch(() => {});
    }

    setBusy(false);
    if (error) return setError(error.message);
    if (status === "delivered" || status === "cancelled") {
      router.push("/manager");
      router.refresh();
    } else {
      router.refresh();
    }
  }

  return (
    <PageContainer max="max-w-2xl">
      <button
        onClick={() => router.push("/manager")}
        className="mb-4 flex items-center gap-1.5 text-sm text-text-muted"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-text">{order.order_number}</h1>
            <Badge tone={order.payment_method === "cod" ? "warn" : "success"}>
              {order.payment_method === "cod" ? "COD" : "Pre-paid"}
            </Badge>
          </div>
          <p className="mt-2 font-semibold text-text">
            Room {order.room_number}, {order.block} Block
          </p>
          <p className="text-lg font-extrabold text-primary">{money(order.total)}</p>
        </CardBody>
      </Card>

      {order.additional_note && (
        <div className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-warn-dark">
            <MessageSquareText className="h-4 w-4" /> Additional Note
          </p>
          <p className="text-sm font-medium text-text">{order.additional_note}</p>
        </div>
      )}

      {order.payment_screenshot_url && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            Payment Screenshot
          </p>
          <a href={order.payment_screenshot_url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={order.payment_screenshot_url} 
              alt="Payment Screenshot" 
              className="max-h-64 w-full rounded-xl object-cover border border-border hover:opacity-90 transition-opacity" 
            />
          </a>
        </div>
      )}

      <p className="mt-5 mb-2 font-bold text-text">Items</p>
      <div className="space-y-2">
        {order.order_items?.map((it) => {
          const instruction = it.items?.custom_instruction;
          return (
            <div key={it.id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex justify-between">
                <span className="font-medium text-text">
                  {(it.items?.name ?? it.name)} × {it.quantity}
                </span>
                <span className="font-semibold text-primary">{money(it.total_price)}</span>
              </div>
              {instruction && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-warn/10 p-2 text-sm text-text">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  {instruction}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {!delivered ? (
        <div className="mt-6 space-y-3">
          {order.order_status === "placed" && (
            <Button variant="outline" className="w-full" loading={busy} onClick={() => setStatus("preparing")}>
              Start preparing
            </Button>
          )}
          {order.order_status === "preparing" && (
            <Button variant="outline" className="w-full" loading={busy} onClick={() => setStatus("on_the_way")}>
              Out for delivery
            </Button>
          )}
          
          <div className="flex flex-col gap-3">
            {!confirming && !cancelling && (
              <div className="flex items-center gap-3">
                <Button variant="danger" className="flex-1" loading={busy} onClick={() => setCancelling(true)}>
                  Cancel Order
                </Button>
                <Button variant="success" size="lg" className="flex-[2]" onClick={() => setConfirming(true)}>
                  <CheckCircle2 className="h-5 w-5" /> DELIVER
                </Button>
              </div>
            )}
            
            {cancelling && (
              <div className="w-full rounded-2xl border border-error/40 bg-error/5 p-4">
                <p className="mb-2 text-sm font-bold text-error">Cancel Order</p>
                <Textarea
                  placeholder="Reason for cancellation (e.g. Invalid payment screenshot, item out of stock)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="mb-3 w-full border-error/30 bg-surface/50"
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    setCancelling(false);
                    setCancelReason("");
                  }}>
                    Back
                  </Button>
                  <Button variant="danger" className="flex-1" loading={busy} onClick={() => setStatus("cancelled")}>
                    Confirm Cancel
                  </Button>
                </div>
              </div>
            )}

            {confirming && (
              <div className="w-full rounded-2xl border border-success/40 bg-success/5 p-4">
                <p className="mb-3 text-center text-sm font-medium">Mark this order delivered?</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
                    Back
                  </Button>
                  <Button variant="success" className="flex-1" loading={busy} onClick={() => setStatus("delivered")}>
                    Confirm
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={cn("mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 font-bold", 
          order.order_status === "cancelled" ? "bg-error/10 text-error" : "bg-success/10 text-success"
        )}>
          <div className="flex items-center gap-2">
            {order.order_status === "cancelled" ? (
              <><CheckCircle2 className="h-5 w-5 opacity-0 hidden" /> Cancelled</>
            ) : (
              <><CheckCircle2 className="h-5 w-5" /> Delivered</>
            )}
          </div>
          {order.rating && order.order_status === "delivered" && (
            <div className="mt-3 flex flex-col items-center gap-1 w-full border-t border-success/20 pt-3">
              <div className="flex items-center gap-1 text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < order.rating! ? "fill-primary" : "text-success/30")} />
                ))}
              </div>
              {order.feedback && <p className="text-center text-sm font-normal italic text-success/80">"{order.feedback}"</p>}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
