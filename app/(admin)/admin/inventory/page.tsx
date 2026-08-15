import { createClient } from "@/lib/supabase/server";
import { InventoryManager } from "@/components/admin/inventory-manager";
import type { Item, Restaurant, Campus } from "@/lib/types/models";

export default async function InventoryPage() {
  const supabase = await createClient();
  
  const { data: items } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .order("name");
    
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("*")
    .order("name");
    
  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .order("name");
    
  return (
    <InventoryManager
      items={(items as Item[]) ?? []}
      restaurants={(restaurants as Restaurant[]) ?? []}
      campuses={(campuses as Campus[]) ?? []}
    />
  );
}
