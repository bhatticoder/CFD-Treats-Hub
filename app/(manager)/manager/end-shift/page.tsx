import { createClient } from "@/lib/supabase/server";
import { myProfileWithCampus } from "@/lib/db/server-helpers";
import { EndShift } from "@/components/end-shift";
import type { Order } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function EndShiftPage() {
  const supabase = await createClient();
  const profileWithCampus = await myProfileWithCampus();
  const campus = profileWithCampus?.campus ?? null;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  let query = supabase
    .from("orders")
    .select("order_status, payment_method, total")
    .gte("created_at", startOfDay);

  if (campus?.id) {
    query = query.eq("campus_id", campus.id);
  }

  const { data } = await query;
  const orders = (data as Pick<Order, "order_status" | "payment_method" | "total">[]) ?? [];
  const delivered = orders.filter((o) => o.order_status === "delivered");
  const summary = {
    delivered: delivered.length,
    cod: delivered.filter((o) => o.payment_method === "cod").reduce((s, o) => s + o.total, 0),
    prepaid: delivered.filter((o) => o.payment_method === "online").reduce((s, o) => s + o.total, 0),
    pending: orders.filter(
      (o) => o.order_status !== "delivered" && o.order_status !== "cancelled",
    ).length,
  };

  return <EndShift summary={summary} campus={campus} />;
}
