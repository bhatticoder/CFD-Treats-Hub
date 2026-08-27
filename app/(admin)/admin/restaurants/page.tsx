import { createClient } from "@/lib/supabase/server";
import { RestaurantsManager } from "@/components/admin/restaurants-manager";
import type { Restaurant, Campus } from "@/lib/types/models";

export default async function RestaurantsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .order("name");
  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .order("name");
  return <RestaurantsManager restaurants={(data as Restaurant[]) ?? []} campuses={(campuses as Campus[]) ?? []} />;
}
