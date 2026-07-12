import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { InventoryManager } from "@/components/admin/inventory-manager";
import type { Item } from "@/lib/types/models";

export default async function InventoryPage() {
  const profile = await myProfile();
  const campusId = profile?.campus_id ?? "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("campus_id", campusId)
    .order("name");
  return <InventoryManager items={(data as Item[]) ?? []} campusId={campusId} />;
}
