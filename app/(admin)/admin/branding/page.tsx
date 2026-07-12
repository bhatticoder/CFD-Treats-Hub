import { createClient } from "@/lib/supabase/server";
import { myProfile } from "@/lib/db/server-helpers";
import { Branding } from "@/components/admin/branding";
import type { Campus } from "@/lib/types/models";

export default async function BrandingPage() {
  const profile = await myProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("campuses")
    .select("*")
    .eq("id", profile?.campus_id ?? "")
    .maybeSingle();
  return <Branding campus={data as Campus} />;
}
