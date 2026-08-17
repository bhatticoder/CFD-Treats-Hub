import { createClient } from "@/lib/supabase/server";
import { AdminVouchers } from "@/components/admin/admin-vouchers";
import type { Campus, Voucher } from "@/lib/types/models";

export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  const supabase = await createClient();
  const { data: campuses } = await supabase.from("campuses").select("*").order("name");
  const { data: vouchers } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
  
  return (
    <AdminVouchers
      campuses={(campuses as Campus[]) ?? []}
      vouchers={(vouchers as Voucher[]) ?? []}
    />
  );
}
