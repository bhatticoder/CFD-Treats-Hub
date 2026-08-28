import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic"; // Ensure it's not cached

// This endpoint runs automatically via Vercel Cron every day.
// It performs a lightweight query to Supabase to register activity,
// preventing the free-tier database from pausing / sleeping.
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Perform a tiny query to wake up/keep alive the DB
    const { data, error } = await supabase.from("campuses").select("id").limit(1);

    if (error) {
      console.error("Keepalive DB Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Database kept alive.",
      timestamp: new Date().toISOString(),
      active: !!data
    });
  } catch (err) {
    console.error("Keepalive Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
