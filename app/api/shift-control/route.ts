import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileDoc = await adminDb.collection("profiles").doc(user.id).get();
    const profile = profileDoc.data();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin role required" }, { status: 403 });
    }

    const { campusId, enabled } = await req.json();

    if (!campusId) {
      return NextResponse.json({ error: "campusId required" }, { status: 400 });
    }

    await adminDb.collection("campuses").doc(campusId).update({
      manager_shift_control_enabled: Boolean(enabled)
    });

    return NextResponse.json({ success: true, enabled });
  } catch (e: any) {
    const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
