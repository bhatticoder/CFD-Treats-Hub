"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Info, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types/models";

export function ManagerOrderDetail({ order }: { order: Order }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const delivered = order.order_status === "delivered";

  async function setStatus(status: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      status === "delivered"
        ? await supabase.rpc("mark_delivered", { p_order_id: order.id })
        : await supabase.from("orders").update({ order_status: status }).eq("id", order.id);
    setBusy(false);
    if (error) return setError(error.message);
    if (status === "delivered") {
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
          {!confirming ? (
            <Button variant="success" size="lg" className="w-full" onClick={() => setConfirming(true)}>
              <CheckCircle2 className="h-5 w-5" /> DELIVER
            </Button>
          ) : (
            <div className="rounded-2xl border border-success/40 bg-success/5 p-4">
              <p className="mb-3 text-center text-sm font-medium">Mark this order delivered?</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button variant="success" className="flex-1" loading={busy} onClick={() => setStatus("delivered")}>
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl bg-success/10 p-4 font-bold text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Delivered
          </div>
          {order.rating && (
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
