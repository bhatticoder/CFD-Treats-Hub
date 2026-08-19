import { createClient } from "@/lib/supabase/server";
import { AdminCharges } from "@/components/admin/admin-charges";
import type { Campus } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function ChargesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("campuses").select("*").order("name");
  return <AdminCharges campuses={(data as Campus[]) ?? []} />;
}
