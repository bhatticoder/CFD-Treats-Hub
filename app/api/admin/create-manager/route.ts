import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { myProfile } from "@/lib/db/server-helpers";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const caller = await myProfile();
    if (!caller || caller.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { email, full_name, phone, campus_id } = await request.json();

    if (!email || !full_name || !campus_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if profile exists
    const profilesRef = adminDb.collection("profiles");
    const snapshot = await profilesRef.where("email", "==", email.toLowerCase()).get();

    if (!snapshot.empty) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email.toLowerCase());
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        userRecord = await adminAuth.createUser({
          email: email.toLowerCase(),
          displayName: full_name,
        });
      } else {
        throw e;
      }
    }

    const newId = userRecord.uid;

    await profilesRef.doc(newId).set({
      id: newId,
      email: email.toLowerCase(),
      full_name,
      phone,
      campus_id,
      role: "manager",
      is_active: true,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ data: "success", error: null });
  } catch (error: any) {
    console.error("Error creating manager:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
