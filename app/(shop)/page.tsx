import { createClient } from "@/lib/supabase/server";
import { MenuBrowser } from "@/components/menu-browser";
import { isPreorderOpen } from "@/lib/domain/preorder";
import type { Campus, Item, Profile } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, campuses(*)")
    .eq("id", user!.id)
    .maybeSingle();

  const p = profile as (Profile & { campuses?: Campus }) | null;
  const campus = p?.campuses ?? null;
  const campusId = p?.campus_id;

  const preordersOpen = isPreorderOpen(campus);

  // Fetch IDs of active (non-hidden) restaurants for this campus.
  const { data: activeRestaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("campus_id", campusId ?? "")
    .eq("is_active", true);
  const activeRestIds = new Set((activeRestaurants ?? []).map((r) => r.id));

  const { data: rawItems } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", campusId ?? "")
    .eq("is_preorder", false)
    .order("category")
    .order("name");

  // Filter out items belonging to hidden restaurants.
  const items = ((rawItems as Item[]) ?? []).filter(
    (i) => !i.restaurant_id || activeRestIds.has(i.restaurant_id),
  );

  // Shift is active if the admin toggled it on, OR if there are in-stock items.
  const hasStock = items.some((i) => i.is_available && i.stock_quantity > 0);
  const shiftActive = (campus?.shift_active ?? true) || hasStock;

  const firstName = p?.full_name?.split(" ")[0] ?? "there";

  return (
    <MenuBrowser
      items={items}
      shiftActive={shiftActive}
      preordersOpen={preordersOpen}
      firstName={firstName}
      campusName={campus?.name ?? "CFD Campus"}
    />
  );
}
