import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { AdminPreorders } from "@/components/admin/admin-preorders";
import type { Order } from "@/lib/types/models";

export default async function PreordersPage() {
  const profile = await myProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*, items(name, restaurants(name)))")
    .eq("campus_id", profile?.campus_id ?? "")
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });
  return <AdminPreorders preorders={(data as Order[]) ?? []} />;
}
