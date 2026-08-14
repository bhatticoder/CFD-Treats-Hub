import { createClient } from "@/lib/supabase/server";
import { AdminShiftView } from "@/components/admin/admin-shift-view";
import type { Campus } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function AdminShiftPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("campuses").select("*").order("name");
  return <AdminShiftView campuses={(data as Campus[]) ?? []} />;
}
