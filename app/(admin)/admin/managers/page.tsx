import { createClient } from "@/lib/supabase/server";
import { ManagersManager } from "@/components/admin/managers-manager";
import type { Campus, Profile } from "@/lib/types/models";

export default async function ManagersPage() {
  const supabase = await createClient();
  const { data: managers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "manager")
    .order("full_name");
  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .order("name");
  return (
    <ManagersManager
      managers={(managers as Profile[]) ?? []}
      campuses={(campuses as Campus[]) ?? []}
    />
  );
}
