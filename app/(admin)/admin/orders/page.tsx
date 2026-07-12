import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { AdminOrders } from "@/components/admin/admin-orders";
import type { Order } from "@/lib/types/models";

export default async function AdminOrdersPage() {
  const profile = await myProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("campus_id", profile?.campus_id ?? "")
    .order("created_at", { ascending: false });
  return <AdminOrders orders={(data as Order[]) ?? []} />;
}
