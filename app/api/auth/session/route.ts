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
    const decodedToken = await adminAuth.verifyIdToken(idToken);
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
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn
    });

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

    // Return detailed error (remove in production)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unauthorized request"
    }, { status: 500 }); // Change to 500 for debugging
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
