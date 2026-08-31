import webpush from "web-push";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { currentUser } from "@/lib/db/server-helpers";


export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: "Push notifications not configured" }, { status: 501 });
    }

    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { campusId, role, userIds, title, message, url } = body;

    let targetUserIds: string[] = [];

    // If campusId and role are provided, fetch those users
    if (campusId && role) {
      const profilesSnapshot = await adminDb.collection("profiles")
        .where("campus_id", "==", campusId)
        .where("role", "==", role)
        .get();
        
      if (!profilesSnapshot.empty) {
        targetUserIds = [...targetUserIds, ...profilesSnapshot.docs.map(d => d.id)];
      }
    }

    // If explicit userIds are provided, add them
    if (userIds && Array.isArray(userIds)) {
      targetUserIds = [...targetUserIds, ...userIds];
    }

    // Deduplicate
    targetUserIds = Array.from(new Set(targetUserIds));

    if (targetUserIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Fetch subscriptions (Firestore 'in' limits to 10 elements, so chunk them)
    let subs: any[] = [];
    for (let i = 0; i < targetUserIds.length; i += 10) {
      const chunk = targetUserIds.slice(i, i + 10);
      const subsSnapshot = await adminDb.collection("push_subscriptions")
        .where("user_id", "in", chunk)
        .get();
      subsSnapshot.docs.forEach(d => subs.push({ id: d.id, ...d.data() }));
    }

    if (subs.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || "/",
    });

    let successCount = 0;
    const batch = adminDb.batch();
    let deletions = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        }, payload, {
          vapidDetails: {
            subject: "mailto:admin@cfdtreats.com",
            publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
            privateKey: process.env.VAPID_PRIVATE_KEY as string,
          }
        });
        successCount++;
      } catch (err: any) {
        console.error("Error sending push to", sub.endpoint, err);
        // If subscription is invalid/expired (410 or 404), remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
           batch.delete(adminDb.collection("push_subscriptions").doc(sub.id));
           deletions++;
        }
      }
    }

    if (deletions > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error: any) {
    console.error("Push send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
