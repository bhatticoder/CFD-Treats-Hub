import { createClient } from "@/lib/supabase/server";
import { UsersManager } from "@/components/admin/users-manager";
import type { Campus, Profile } from "@/lib/types/models";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("profiles")
    .select("*, campuses(name)")
    .eq("role", "customer")
    .order("full_name");
  const { data: campuses } = await supabase.from("campuses").select("*").order("name");

  const list = ((students as (Profile & { campuses?: { name: string } })[]) ?? []).map((s) => ({
    ...s,
    campus_name: s.campuses?.name ?? null,
  }));

  return <UsersManager students={list} campuses={(campuses as Campus[]) ?? []} />;
}
