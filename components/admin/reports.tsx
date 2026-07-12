"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import type { Order } from "@/lib/types/models";

const RANGES = [
  [1, "Today"],
  [7, "This Week"],
  [30, "This Month"],
] as const;

export function Reports({ campusId }: { campusId: string }) {
  const [days, setDays] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)).toISOString();
    const { data } = await createClient()
      .from("orders")
      .select("*")
      .eq("campus_id", campusId)
      .gte("created_at", start)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [campusId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const cod = orders.filter((o) => o.payment_method === "cod").reduce((s, o) => s + o.total, 0);
  const delivered = orders.filter((o) => o.order_status === "delivered").length;

  function exportCsv() {
    const header = "Order Number,Date,Room,Block,Payment,Status,Subtotal,Delivery,Total";
    const rows = orders.map((o) =>
      [
        o.order_number,
        new Date(o.created_at).toISOString(),
        o.room_number,
        o.block,
        o.payment_method,
        o.order_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cfd_report_${RANGES.find((r) => r[0] === days)?.[1].replace(/\s/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    ["Orders", `${orders.length}`],
    ["Revenue", money(revenue)],
    ["COD", money(cod)],
    ["Pre-paid", money(revenue - cod)],
    ["Delivered", `${delivered}`],
  ];

  return (
    <PageContainer>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-text">Reports</h1>
        <div className="ml-auto flex gap-2">
          {RANGES.map(([d, label]) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm",
                days === d ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text-muted",
              )}
            >
              {label}
            </button>
          ))}
          <Button onClick={exportCsv} disabled={orders.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.map(([label, value]) => (
              <Card key={label}>
                <CardBody className="p-4">
                  <p className="text-xl font-extrabold text-text">{value}</p>
                  <p className="text-sm text-text-muted">{label}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-text">{o.order_number}</p>
                  <p className="text-text-muted">
                    {o.room_number} {o.block} · {o.payment_method.toUpperCase()} · {o.order_status}
                  </p>
                </div>
                <span className="font-bold text-primary">{money(o.total)}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="p-6 text-center text-text-faint">No orders in range.</p>}
          </div>
        </>
      )}
    </PageContainer>
  );
}
