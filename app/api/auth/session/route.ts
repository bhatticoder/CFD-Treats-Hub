import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;
const SESSION_EXPIRES_IN_MS = SESSION_MAX_AGE_SECONDS * 1000;

type SameSite = "lax" | "strict" | "none";

function getCookieSameSite(): SameSite {
  const configured = process.env.FIREBASE_COOKIE_SAME_SITE?.toLowerCase();

  if (
    configured === "lax" ||
    configured === "strict" ||
    configured === "none"
  ) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "none" : "lax";
}

function logFirebaseError(stage: string, error: unknown) {
  console.error(`[session] ${stage} failed`, {
    code:
      typeof error === "object" && error && "code" in error
        ? error.code
        : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const idToken =
      typeof body === "object" &&
      body !== null &&
      "idToken" in body
        ? body.idToken
        : undefined;

    if (typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json(
        { error: "Missing ID token" },
        { status: 400 }
      );
    }

    let adminAuth;

    try {
      adminAuth = getAdminAuth();
    } catch (error) {
      logFirebaseError("admin_initialization", error);

      return NextResponse.json(
        { error: "Authentication service unavailable" },
        { status: 503 }
      );
    }

    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      logFirebaseError("verify_id_token", error);

      return NextResponse.json(
        { error: "Unauthorized request" },
        { status: 401 }
      );
    }

    const { uid, email } = decodedToken;
    let needsRegistration = true;

    if (email) {
      try {
        const db = getAdminDb();
        const profiles = db.collection("profiles");

        const snapshot = await profiles
          .where("email", "==", email.toLowerCase())
          .get();

        if (!snapshot.empty) {
          needsRegistration = false;

          const existingDoc = snapshot.docs[0];

          if (existingDoc.id !== uid) {
            const data = existingDoc.data();
            data.id = uid;

            await profiles.doc(uid).set(data);
            await existingDoc.ref.delete();
          }
        }
      } catch (error) {
        logFirebaseError("profile_lookup_or_migration", error);
      }
    }

    let sessionCookie: string;

    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRES_IN_MS,
      });
    } catch (error) {
      logFirebaseError("create_session_cookie", error);
      const message = getErrorMessage(error).toLowerCase();

      if (message.includes("service account")) {
        return NextResponse.json(
          {
            error:
              "Unable to create session. Set FIREBASE_SERVICE_ACCOUNT_ID (or FIREBASE_CLIENT_EMAIL) for Firebase Admin session signing.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: "Unable to create session" },
        { status: 502 }
      );
    }

    const sameSite = getCookieSameSite();
    const response = NextResponse.json({
      status: "success",
      needsRegistration,
    });

    response.cookies.set({
      name: "firebase_session",
      value: sessionCookie,
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || sameSite === "none",
      sameSite,
      path: "/",
    });

    return response;
  } catch (error) {
    logFirebaseError("unexpected", error);
    return NextResponse.json(
      { error: "Unexpected authentication server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const sameSite = getCookieSameSite();
  const response = NextResponse.json({ status: "success" });

  response.cookies.set({
    name: "firebase_session",
    value: "",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
  });

  return response;
}