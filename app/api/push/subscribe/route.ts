import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Generate a consistent ID based on user_id and a hash of the endpoint
    const crypto = await import("crypto");
    const endpointHash = crypto.createHash('md5').update(subscription.endpoint).digest('hex');
    const docId = `${user.id}_${endpointHash}`;

    await adminDb.collection("push_subscriptions").doc(docId).set({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
