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
    .select("*")
    .eq("campus_id", campusId ?? "")
    .order("category")
    .order("name");

  const firstName = p?.full_name?.split(" ")[0] ?? "there";

  return (
    <MenuBrowser
      items={(items as Item[]) ?? []}
      shiftActive={shiftActive}
      firstName={firstName}
      campusName={p?.campuses?.name ?? "CFD Campus"}
    />
  );
}
