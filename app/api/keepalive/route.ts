import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

// This endpoint runs automatically via Vercel Cron every day.
export async function GET() {
  try {
    // Perform a tiny query to wake up/keep alive the Vercel function and Firestore connection
    const snapshot = await adminDb.collection("campuses").limit(1).get();

    return NextResponse.json({
      success: true,
      message: "Keepalive successful.",
      timestamp: new Date().toISOString(),
      active: !snapshot.empty
    });
  } catch (err) {
    console.error("Keepalive Error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
