"use client";

import { useMemo, useState } from "react";
import { Clock, Store } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import type { Order } from "@/lib/types/models";

type ItemRow = { name: string; restaurant: string; qty: number };

export function AdminPreorders({ preorders }: { preorders: Order[] }) {
  const [view, setView] = useState<"time" | "restaurant">("time");

  // Aggregate item quantities grouped by restaurant → "what to buy where".
  const byRestaurant = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const o of preorders) {
      for (const it of o.order_items ?? []) {
        const rec = it.items as { name?: string; restaurants?: { name?: string } | null } | null;
        const restaurant = rec?.restaurants?.name ?? "Unassigned";
        const name = rec?.name ?? it.name;
        if (!map.has(restaurant)) map.set(restaurant, new Map());
        const inner = map.get(restaurant)!;
        inner.set(name, (inner.get(name) ?? 0) + it.quantity);
      }
    }
    const out: { restaurant: string; items: ItemRow[] }[] = [];
    for (const [restaurant, inner] of map) {
      out.push({
        restaurant,
        items: [...inner].map(([name, qty]) => ({ name, restaurant, qty })),
      });
    }
    return out.sort((a, b) => a.restaurant.localeCompare(b.restaurant));
  }, [preorders]);

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Pre-orders</h1>
      <p className="mb-4 text-sm text-text-muted">
        {preorders.length} pre-order(s). Use “By restaurant” to see what to buy where.
      </p>

      <div className="mb-5 flex gap-2">
        {(["time", "restaurant"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm",
              view === v ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text-muted",
            )}
          >
            {v === "time" ? <Clock className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            {v === "time" ? "By time" : "By restaurant"}
          </button>
        ))}
      </div>

      {preorders.length === 0 ? (
        <EmptyState title="No pre-orders yet" />
      ) : view === "time" ? (
        <div className="space-y-3">
          {preorders.map((o) => (
            <Card key={o.id}>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">{o.order_number}</span>
                  <Badge tone={o.payment_method === "cod" ? "warn" : "success"}>
                    {o.payment_method === "cod" ? "COD" : "Paid"}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">
                  Room {o.room_number}, {o.block} · {new Date(o.created_at).toLocaleString()}
                </p>
                <ul className="mt-2 text-sm text-text">
                  {o.order_items?.map((it) => (
                    <li key={it.id}>
                      {it.name} × {it.quantity}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-primary">{money(o.total)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {byRestaurant.map((grp) => (
            <Card key={grp.restaurant}>
              <CardBody>
                <p className="mb-2 flex items-center gap-2 font-bold text-text">
                  <Store className="h-4 w-4 text-primary" /> {grp.restaurant}
                </p>
                <ul className="divide-y divide-border">
                  {grp.items.map((it) => (
                    <li key={it.name} className="flex justify-between py-2 text-sm">
                      <span className="text-text">{it.name}</span>
                      <span className="font-bold text-primary">×{it.qty}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
