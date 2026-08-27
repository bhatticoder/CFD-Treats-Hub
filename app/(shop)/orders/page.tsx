import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ORDER_STATUS_LABEL } from "@/lib/domain/constants";
import type { Order } from "@/lib/types/models";
import { ReceiptText } from "lucide-react";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  const orders = (data as Order[]) ?? [];

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Your Orders</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-14 w-14" />}
          title="No orders yet"
          hint="Your past treats will show up here."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/track/${o.id}`}
              className="block rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-bg-muted"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-text">{o.order_number}</span>
                <Badge
                  tone={
                    o.order_status === "delivered"
                      ? "success"
                      : o.order_status === "cancelled"
                        ? "error"
                        : "primary"
                  }
                >
                  {ORDER_STATUS_LABEL[o.order_status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {new Date(o.created_at).toLocaleString()} ·{" "}
                {o.order_items?.length ?? 0} item(s)
              </p>
              <p className="mt-1 font-bold text-primary">{money(o.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
