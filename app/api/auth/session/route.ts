import { NextResponse, NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Verify token
    const adminAuth = getAdminAuth();
    console.log("[session] verifying idToken...");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log("[session] idToken verified for uid:", decodedToken.uid);
    const { uid, email } = decodedToken;

    let needsRegistration = true;

    if (email) {
      try {
        const adminDb = getAdminDb();
        const profilesRef = adminDb.collection("profiles");
        const q = profilesRef.where("email", "==", email.toLowerCase());
        const snapshot = await q.get();

        if (!snapshot.empty) {
          needsRegistration = false;
          const existingDoc = snapshot.docs[0];

          if (existingDoc.id !== uid) {
            const data = existingDoc.data();
            data.id = uid;
            await profilesRef.doc(uid).set(data);
            await existingDoc.ref.delete();
          }
        }
      } catch (dbError) {
        console.error("Firestore error:", dbError);
        // Continue even if migration fails
      }
    }

    // Create session cookie
    console.log("[session] creating session cookie...");
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn
    });
    console.log("[session] session cookie created");

    const options = {
      name: "firebase_session",
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const, // Add this!
      path: "/",
    };

    const response = NextResponse.json({
      status: "success",
      needsRegistration
    });
    response.cookies.set(options);

    return response;
  } catch (error) {
    console.error("Session error details:", error);
    console.error("Session error stack:", error instanceof Error ? error.stack : "no stack");
    console.error("Firebase env present:", {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    });

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unauthorized request",
      stage: "session_creation",
    }, { status: 500 });
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
