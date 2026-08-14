import { createClient } from "@/lib/supabase/server";
import { CampusesManager } from "@/components/admin/campuses-manager";
import type { Campus } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function CampusesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("campuses").select("*").order("name");
  return <CampusesManager campuses={(data as Campus[]) ?? []} />;
}
