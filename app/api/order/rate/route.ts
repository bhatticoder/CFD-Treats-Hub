import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, rating, feedback } = await req.json();

    if (!orderId || !rating) {
      return NextResponse.json({ error: "Order ID and rating are required" }, { status: 400 });
    }

    // Update the order rating and feedback
    // Note: RLS ensures users can only update their own orders.
    const { error } = await supabase
      .from("orders")
      .update({ rating, feedback })
      .eq("id", orderId)
      .eq("customer_id", user.id); // Explicit check for safety

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
