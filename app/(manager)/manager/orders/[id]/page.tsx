import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { myProfileWithCampus } from "@/lib/db/server-helpers";
import { ManagerOrderDetail } from "@/components/manager-order-detail";
import type { Order } from "@/lib/types/models";

export default async function ManagerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profileWithCampus = await myProfileWithCampus();
  const campusId = profileWithCampus?.campus_id;

  // Build query with campus ownership check (Bug #4 fix)
  let query = supabase
    .from("orders")
    .select("*, order_items(*, items(name, image_url, custom_instruction))")
    .eq("id", id);

  if (campusId) {
    query = query.eq("campus_id", campusId);
  }

  const { data } = await query.maybeSingle();

  if (!data) notFound();
  return <ManagerOrderDetail order={data as Order} />;
}

