import { createClient } from "@/lib/supabase/server";
import { MenuBrowser } from "@/components/menu-browser";
import type { Item, Profile } from "@/lib/types/models";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, campuses(name, shift_active)")
    .eq("id", user!.id)
    .maybeSingle();

  const p = profile as (Profile & { campuses?: { name: string; shift_active: boolean } }) | null;
  const campusId = p?.campus_id;
  const shiftActive = p?.campuses?.shift_active ?? true;

  const { data: items } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", campusId ?? "")
    .eq("is_preorder", false)
    .order("category")
    .order("name");

  // Are there any pre-order items open right now for this campus?
  const { count: preorderCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("campus_id", campusId ?? "")
    .eq("is_preorder", true)
    .eq("is_available", true);

  const firstName = p?.full_name?.split(" ")[0] ?? "there";

  return (
    <MenuBrowser
      items={(items as Item[]) ?? []}
      shiftActive={shiftActive}
      preordersOpen={(preorderCount ?? 0) > 0}
      firstName={firstName}
      campusName={p?.campuses?.name ?? "CFD Campus"}
    />
  );
}
