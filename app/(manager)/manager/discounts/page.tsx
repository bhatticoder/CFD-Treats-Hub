import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/app-shell";
import { ManagerDiscounts } from "@/components/manager-discounts";
import type { Item, Profile } from "@/lib/types/models";

export default async function ManagerDiscountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("campus_id, campuses(manager_discount_enabled)")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as (Pick<Profile, "campus_id"> & {
    campuses?: { manager_discount_enabled: boolean };
  }) | null;

  const enabled = p?.campuses?.manager_discount_enabled ?? false;

  if (!enabled) {
    return (
      <PageContainer max="max-w-2xl">
        <h1 className="mb-2 text-2xl font-extrabold text-text">Discounts</h1>
        <div className="rounded-2xl border border-border bg-surface p-6 text-center text-text-muted">
          Manager discounts are currently disabled by Admin.
        </div>
      </PageContainer>
    );
  }

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("campus_id", p!.campus_id ?? "")
    .order("name");

  return <ManagerDiscounts items={(items as Item[]) ?? []} />;
}
