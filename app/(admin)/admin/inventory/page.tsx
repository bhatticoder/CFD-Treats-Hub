import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { InventoryManager } from "@/components/admin/inventory-manager";
import type { Item, Restaurant } from "@/lib/types/models";

export default async function InventoryPage() {
  const profile = await myProfile();
  const campusId = profile?.campus_id ?? "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", campusId)
    .order("name");
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .eq("campus_id", campusId)
    .order("name");
  return (
    <InventoryManager
      items={(data as Item[]) ?? []}
      restaurants={(restaurants as Restaurant[]) ?? []}
      campusId={campusId}
    />
  );
}
