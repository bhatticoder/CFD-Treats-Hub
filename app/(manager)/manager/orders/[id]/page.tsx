import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ManagerOrderDetail } from "@/components/manager-order-detail";
import type { Order } from "@/lib/types/models";

export default async function ManagerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*, items(name, image_url, custom_instruction))")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  return <ManagerOrderDetail order={data as Order} />;
}
