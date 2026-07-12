import { createClient } from "@/lib/supabase/server";
import { OrderTracker } from "@/components/order-tracker";
import type { Order } from "@/lib/types/models";
import { notFound } from "next/navigation";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  return <OrderTracker initial={data as Order} />;
}
