import { createClient } from "@/lib/supabase/server";
import { myProfileWithCampus } from "@/lib/db/server-helpers";
import { ManagerOrders } from "@/components/manager-orders";
import type { Order } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function ManagerOrdersPage() {
  const supabase = await createClient();
  const profileWithCampus = await myProfileWithCampus();
  const campus = profileWithCampus?.campus ?? null;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", startOfDay)
    .order("created_at", { ascending: false });

  if (campus?.id) {
    query = query.eq("campus_id", campus.id);
  }

  const { data } = await query;

  return <ManagerOrders orders={(data as Order[]) ?? []} campus={campus} />;
}
