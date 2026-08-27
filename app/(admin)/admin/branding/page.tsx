import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { Branding } from "@/components/admin/branding";
import type { Campus } from "@/lib/types/models";

export default async function BrandingPage() {
  const profile = await myProfile();
  const supabase = await createClient();
  let query = supabase.from("campuses").select("*");
  if (profile?.role !== "admin") {
    query = query.eq("id", profile?.campus_id ?? "");
  }
  const { data } = await query;
  return <Branding campuses={data as Campus[]} />;
}
