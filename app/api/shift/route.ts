import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { campusId, shiftActive } = await req.json();

    // Verify user is manager or admin
    const profileDoc = await getAdminDb().collection("profiles").doc(user.id).get();
    const profile = profileDoc.data();

    if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
      return NextResponse.json({ error: "Forbidden - Manager or Admin role required" }, { status: 403 });
    }

    const value = Boolean(shiftActive);

    if (campusId) {
      if (profile.role === "manager" && profile.campus_id !== campusId) {
        throw new Error("Not authorized to update this campus");
      }
      
      await getAdminDb().collection("campuses").doc(campusId).update({ shift_active: value });
    } else {
      // Update all campuses (Admin only)
      if (profile.role !== "admin") throw new Error("Only admins can update all campuses");
      
      const campusesSnapshot = await getAdminDb().collection("campuses").where("is_active", "==", true).get();
      const batch = getAdminDb().batch();
      campusesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { shift_active: value });
      });
      await batch.commit();
    }

    return NextResponse.json({ success: true, shift_active: value });
  } catch (e: any) {
    const msg = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
