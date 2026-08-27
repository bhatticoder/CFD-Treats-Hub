import { createClient } from "@/lib/supabase/server";
import { AdminPreorders } from "@/components/admin/admin-preorders";
import type { Campus, Order } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function PreordersPage() {
  const supabase = await createClient();
  // Admin sees every campus (RLS allows) so each can be opened/closed on its own.
  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .eq("is_active", true)
    .order("name");
  const { data } = await supabase
    .from("orders")
    .select(
      "*, order_items(*, items(name, restaurants(name))), profiles(full_name, phone), campuses(name)",
    )
    .eq("is_preorder", true)
    .order("created_at", { ascending: false });
  return (
    <AdminPreorders
      campuses={(campuses as Campus[]) ?? []}
      preorders={(data as Order[]) ?? []}
    />
  );
}
