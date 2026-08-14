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

    const { campusId, shiftActive } = await req.json();

    // Verify user is manager or admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, campus_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      return NextResponse.json({ error: "Forbidden - Manager or Admin role required" }, { status: 403 });
    }

    const value = Boolean(shiftActive);

    if (campusId) {
      const { error } = await supabase
        .from("campuses")
        .update({ shift_active: value })
        .eq("id", campusId);
      if (error) throw error;
    } else {
      // Update all campuses
      const { error } = await supabase
        .from("campuses")
        .update({ shift_active: value })
        .eq("is_active", true);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, shift_active: value });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
