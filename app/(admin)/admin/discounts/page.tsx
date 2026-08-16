import { createClient } from "@/lib/supabase/server";
import { AdminDiscounts } from "@/components/admin/admin-discounts";
import type { Campus, Item } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const supabase = await createClient();
  const { data: campuses } = await supabase.from("campuses").select("*").order("name");
  const { data: items } = await supabase.from("items").select("*").order("name");
  
  return (
    <AdminDiscounts
      campuses={(campuses as Campus[]) ?? []}
      items={(items as Item[]) ?? []}
    />
  );
}
