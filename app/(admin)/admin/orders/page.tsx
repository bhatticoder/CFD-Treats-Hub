import { createClient } from "@/lib/supabase/server";
import { AdminOrders } from "@/components/admin/admin-orders";
import type { Order } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  return <AdminOrders orders={(data as Order[]) ?? []} />;
}
