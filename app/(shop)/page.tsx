import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuBrowser } from "@/components/menu-browser";
import { isPreorderOpen } from "@/lib/domain/preorder";
import type { Campus, Item, Profile } from "@/lib/types/models";

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

  // Pre-order window is on → there's no night stock, send them to pre-order.
  if (isPreorderOpen(campus)) redirect("/preorder");

  const shiftActive = campus?.shift_active ?? true;

  const { data: items } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", campusId ?? "")
    .eq("is_preorder", false)
    .order("category")
    .order("name");

  const firstName = p?.full_name?.split(" ")[0] ?? "there";

  return (
    <MenuBrowser
      items={(items as Item[]) ?? []}
      shiftActive={shiftActive}
      preordersOpen={false}
      firstName={firstName}
      campusName={campus?.name ?? "CFD Campus"}
    />
  );
}
