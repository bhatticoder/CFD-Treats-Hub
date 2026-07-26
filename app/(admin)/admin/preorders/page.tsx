import { createClient } from "@/lib/supabase/server";
import { myCampus } from "@/lib/db/server-helpers";
import { AdminPreorders } from "@/components/admin/admin-preorders";
import type { Campus, Order } from "@/lib/types/models";

export default async function PreordersPage() {
  const campus = await myCampus();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*, items(name, restaurants(name))), profiles(full_name, phone)")
    .eq("campus_id", campus?.id ?? "")
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });
  return (
    <AdminPreorders campus={campus as Campus} preorders={(data as Order[]) ?? []} />
  );
}
