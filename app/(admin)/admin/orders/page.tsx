import { createClient } from "@/lib/supabase/server";
import { AdminOrders } from "@/components/admin/admin-orders";
import type { Order, Campus } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  
  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .eq("is_active", true)
    .order("name");

  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*), profiles(full_name, phone), campuses(name, gender)")
    .order("created_at", { ascending: false });

  return (
    <AdminOrders 
      orders={(data as Order[]) ?? []} 
      campuses={(campuses as Campus[]) ?? []}
    />
  );
}
