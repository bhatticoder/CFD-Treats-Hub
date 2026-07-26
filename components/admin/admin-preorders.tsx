"use client";

import { useMemo, useState } from "react";
import { Clock, Store, User } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { PreorderControl } from "@/components/admin/preorder-control";
import type { Campus, Order } from "@/lib/types/models";

type View = "time" | "restaurant" | "customer";

export function AdminPreorders({
  campus,
  preorders,
}: {
  campus: Campus;
  preorders: Order[];
}) {
  const [view, setView] = useState<View>("time");

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
    return [...map.entries()]
      .map(([restaurant, inner]) => ({
        restaurant,
        items: [...inner].map(([name, qty]) => ({ name, qty })),
      }))
      .sort((a, b) => a.restaurant.localeCompare(b.restaurant));
  }, [preorders]);

  const byCustomer = useMemo(
    () =>
      [...preorders].sort((a, b) => {
        const an = customerName(a);
        const bn = customerName(b);
        return an.localeCompare(bn);
      }),
    [preorders],
  );

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Pre-orders</h1>
      <p className="mb-4 text-sm text-text-muted">
        Open/close pre-ordering and review what everyone ordered.
      </p>

      {campus && (
        <div className="mb-5">
          <PreorderControl campus={campus} />
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {([
          ["time", "By time", Clock],
          ["restaurant", "By restaurant", Store],
          ["customer", "By customer", User],
        ] as const).map(([v, label, Icon]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm",
              view === v
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-text-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {preorders.length === 0 ? (
        <EmptyState title="No pre-orders yet" />
      ) : view === "restaurant" ? (
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
      ) : (
        <div className="space-y-3">
          {(view === "customer" ? byCustomer : preorders).map((o) => (
            <Card key={o.id}>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">
                    {view === "customer" ? customerName(o) : o.order_number}
                  </span>
                  <Badge tone={o.payment_method === "cod" ? "warn" : "success"}>
                    {o.payment_method === "cod" ? "COD" : "Paid"}
                  </Badge>
                </div>
                <p className="text-sm text-text-muted">
                  {o.order_number} · Room {o.room_number}, {o.block}
                  {customerPhone(o) ? ` · ${customerPhone(o)}` : ""} ·{" "}
                  {new Date(o.created_at).toLocaleString()}
                </p>
                <ul className="mt-2 text-sm text-text">
                  {o.order_items?.map((it) => (
                    <li key={it.id}>
                      {it.name} × {it.quantity} —{" "}
                      <span className="text-text-muted">{money(it.total_price)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-primary">{money(o.total)}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function customerName(o: Order): string {
  const p = (o as unknown as { profiles?: { full_name?: string } }).profiles;
  return p?.full_name ?? "Customer";
}
function customerPhone(o: Order): string {
  const p = (o as unknown as { profiles?: { phone?: string } }).profiles;
  return p?.phone ?? "";
}
