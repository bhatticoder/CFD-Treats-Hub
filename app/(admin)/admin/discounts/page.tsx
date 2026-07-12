import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { AdminDiscounts } from "@/components/admin/admin-discounts";
import type { Campus, Item } from "@/lib/types/models";

export default async function AdminDiscountsPage() {
  const profile = await myProfile();
  const campusId = profile?.campus_id ?? "";
  const supabase = await createClient();
  const { data: campus } = await supabase.from("campuses").select("*").eq("id", campusId).maybeSingle();
  const { data: items } = await supabase.from("items").select("*").eq("campus_id", campusId).order("name");
  return (
    <AdminDiscounts
      campus={campus as Campus}
      items={(items as Item[]) ?? []}
    />
  );
}
