"use client";

import { useMemo, useState } from "react";
import { Clock, Store, User, Building2 } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge, EmptyState } from "@/components/ui/misc";
import { PreorderControl } from "@/components/admin/preorder-control";
import type { Campus, Order } from "@/lib/types/models";

type View = "time" | "restaurant" | "customer";

export function AdminPreorders({
  campuses,
  preorders,
}: {
  campuses: Campus[];
  preorders: Order[];
}) {
  const [view, setView] = useState<View>("time");
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const [controlCampusId, setControlCampusId] = useState<string>(campuses[0]?.id || "");

  const controlCampus = campuses.find(c => c.id === controlCampusId) || campuses[0];

  const filtered = useMemo(
    () =>
      campusFilter === "all"
        ? preorders
        : preorders.filter((o) => o.campus_id === campusFilter),
    [preorders, campusFilter],
  );

  const byRestaurant = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const o of filtered) {
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
  }, [filtered]);

  const byCustomer = useMemo(
    () => [...filtered].sort((a, b) => customerName(a).localeCompare(customerName(b))),
    [filtered],
  );

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Pre-orders</h1>
      <p className="mb-4 text-sm text-text-muted">
        Each campus opens/closes independently. Review what everyone ordered.
      </p>

      {/* Per-campus open/close controls */}
      <div className="mb-6 space-y-4">
        {campuses.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-text">Select Campus:</span>
            <Select
              className="w-full max-w-xs"
              value={controlCampusId}
              onChange={(e) => setControlCampusId(e.target.value)}
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        )}
        {controlCampus && (
          <div key={controlCampus.id}>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-text">
              <Building2 className="h-4 w-4 text-primary" /> {controlCampus.name}
            </p>
            <PreorderControl campus={controlCampus} />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        {campuses.length > 1 && (
          <Select
            className="ml-auto w-44"
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
          >
            <option value="all">All campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
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
          {(view === "customer" ? byCustomer : filtered).map((o) => (
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
                  {campusName(o) ? `${campusName(o)} · ` : ""}
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
  return (o as unknown as { profiles?: { full_name?: string } }).profiles?.full_name ?? "Customer";
}
function customerPhone(o: Order): string {
  return (o as unknown as { profiles?: { phone?: string } }).profiles?.phone ?? "";
}
function campusName(o: Order): string {
  return (o as unknown as { campuses?: { name?: string } }).campuses?.name ?? "";
}
