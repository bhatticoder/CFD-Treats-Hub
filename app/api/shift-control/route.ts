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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin role required" }, { status: 403 });
    }

    const { campusId, enabled } = await req.json();

    if (!campusId) {
      return NextResponse.json({ error: "campusId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("campuses")
      .update({ manager_shift_control_enabled: Boolean(enabled) })
      .eq("id", campusId);

    if (error) throw error;

    return NextResponse.json({ success: true, enabled });
  } catch (e: any) {
    const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
