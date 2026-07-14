import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { RestaurantsManager } from "@/components/admin/restaurants-manager";
import type { Restaurant } from "@/lib/types/models";

export default async function RestaurantsPage() {
  const profile = await myProfile();
  const campusId = profile?.campus_id ?? "";
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("campus_id", campusId)
    .order("name");
  return <RestaurantsManager restaurants={(data as Restaurant[]) ?? []} campusId={campusId} />;
}
