import { createClient } from "@/lib/supabase/server";
import { ManagerOrders } from "@/components/manager-orders";
import type { Order } from "@/lib/types/models";

export default async function ManagerOrdersPage() {
  const supabase = await createClient();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .gte("created_at", startOfDay)
    .order("created_at", { ascending: false });

  return <ManagerOrders orders={(data as Order[]) ?? []} />;
}
