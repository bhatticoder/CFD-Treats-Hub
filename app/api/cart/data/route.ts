import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const itemIds: string[] = body.itemIds || [];

    const profileDoc = await adminDb.collection("profiles").doc(user.id).get();
    const profile = profileDoc.data();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let campus = null;
    let campusId = profile.campus_id;

    if (!campusId) {
      // Auto-heal missing profile campus_id
      const activeCampusesSnapshot = await adminDb.collection("campuses").where("is_active", "==", true).limit(1).get();
      if (!activeCampusesSnapshot.empty) {
        campus = { id: activeCampusesSnapshot.docs[0].id, ...activeCampusesSnapshot.docs[0].data() };
        campusId = campus.id;
        await adminDb.collection("profiles").doc(user.id).update({ campus_id: campusId });
      }
    } else {
      const campusDoc = await adminDb.collection("campuses").doc(campusId).get();
      if (campusDoc.exists) {
        campus = { id: campusDoc.id, ...campusDoc.data() };
      }
    }

    let vouchers: any[] = [];
    if (campusId) {
      const vSnapshot = await adminDb.collection("vouchers")
        .where("campus_id", "==", campusId)
        .where("is_active", "==", true)
        .get();
      vouchers = vSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    let freshItems: any[] = [];
    if (itemIds.length > 0) {
      // Fetch in chunks of 10 if necessary, but cart usually has < 10 items
      const chunks = [];
      for (let i = 0; i < itemIds.length; i += 10) chunks.push(itemIds.slice(i, i + 10));
      for (const chunk of chunks) {
        const iSnapshot = await adminDb.collection("items").where("id", "in", chunk).get();
        iSnapshot.docs.forEach(d => freshItems.push({ id: d.id, ...d.data() }));
      }
    }

    return NextResponse.json({
      profile: { ...profile, campuses: campus },
      vouchers,
      freshItems
    });
  } catch (error: any) {
    console.error("Cart data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
