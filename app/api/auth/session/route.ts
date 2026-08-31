import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Dynamically import adminAuth and adminDb
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");

    // Verify token to get email and uid for migration check
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    let needsRegistration = true;

    if (email) {
      // Check if they have an old Supabase profile that needs migrating to the new Firebase UID
      const profilesRef = adminDb.collection("profiles");
      const q = profilesRef.where("email", "==", email.toLowerCase());
      const snapshot = await q.get();
      
      if (!snapshot.empty) {
        needsRegistration = false;
        const existingDoc = snapshot.docs[0];
        if (existingDoc.id !== uid) {
          // Migrate old Supabase profile to the new Firebase UID document
          const data = existingDoc.data();
          data.id = uid; 
          await profilesRef.doc(uid).set(data);
          await existingDoc.ref.delete();
        }
      }
    }

    // Create the session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Set cookie policy for session cookie.
    const options = {
      name: "firebase_session",
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };

    const response = NextResponse.json({ status: "success", needsRegistration });
    response.cookies.set(options);

    return response;
  } catch (error) {
    console.error("Error creating session cookie", error);
    return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: "success" });
  response.cookies.set({
    name: "firebase_session",
    value: "",
    maxAge: 0,
    path: "/",
  });
  return response;
}
