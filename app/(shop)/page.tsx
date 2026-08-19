import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app-shell";
import { MenuBrowser } from "@/components/menu-browser";
import { PushPrompt } from "@/components/push-prompt";
import { isPreorderOpen } from "@/lib/domain/preorder";
import type { Campus, Item, Profile } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, campuses(*)")
    .eq("id", user.id)
    .maybeSingle();

  const p = profile as (Profile & { campuses?: Campus | Campus[] }) | null;
  const rawCampus = p?.campuses ?? null;
  const campus = Array.isArray(rawCampus) ? rawCampus[0] : rawCampus;
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

  // Fetch all categories for this campus
  const { data: rawCategories } = await supabase
    .from("item_categories")
    .select("name")
    .eq("campus_id", campusId ?? "")
    .order("name");
  
  const allCategories = rawCategories ? rawCategories.map((c) => c.name) : [];

  // Filter out items belonging to hidden restaurants.
  const items = ((rawItems as Item[]) ?? []).filter(
    (i) => !i.restaurant_id || activeRestIds.has(i.restaurant_id),
  );

  // Shift is active if the campus shift_active flag is true (defaults to true if null).
  const shiftActive = campus?.shift_active ?? true;

  const firstName = p?.full_name?.split(" ")[0] ?? "there";

  return (
    <PageContainer>
      <PushPrompt />
      <MenuBrowser
        items={items}
        categories={allCategories}
        shiftActive={shiftActive}
        preordersOpen={preordersOpen}
        firstName={firstName}
        campusName={campus?.name ?? "CFD Campus"}
        deliveryActive={campus?.delivery_active ?? true}
        collectionRoom={campus?.collection_room ?? null}
      />
    </PageContainer>
  );
}
