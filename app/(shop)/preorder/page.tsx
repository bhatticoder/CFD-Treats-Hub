import { createClient } from "@/lib/supabase/server";
import { PreorderBrowser } from "@/components/preorder-browser";
import type { Item, Profile } from "@/lib/types/models";

export default async function PreorderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, campuses(payment_account_info)")
    .eq("id", user!.id)
    .maybeSingle();
  const p = profile as (Profile & { campuses?: { payment_account_info: string | null } }) | null;

  const { data: items } = await supabase
    .from("items")
    .select("*, restaurants(name)")
    .eq("campus_id", p?.campus_id ?? "")
    .eq("is_preorder", true)
    .eq("is_available", true)
    .order("name");

  return (
    <PreorderBrowser
      items={(items as Item[]) ?? []}
      defaultRoom={p?.room_number ?? ""}
      defaultBlock={p?.block ?? "Iqbal"}
      account={p?.campuses?.payment_account_info ?? null}
    />
  );
}
