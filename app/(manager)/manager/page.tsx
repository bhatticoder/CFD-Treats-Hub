import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { ManagerOrders } from "@/components/manager-orders";
import type { Order } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function ManagerOrdersPage() {
  const supabase = await createClient();
  const profile = await myProfile();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", startOfDay)
    .order("created_at", { ascending: false });

  if (profile?.campus_id) {
    query = query.eq("campus_id", profile.campus_id);
  }

  const { data } = await query;

  return <ManagerOrders orders={(data as Order[]) ?? []} />;
}
