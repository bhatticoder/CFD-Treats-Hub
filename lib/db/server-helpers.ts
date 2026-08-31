import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Campus, Profile } from "@/lib/types/models";

// `cache()` dedupes within a single request/render.

/** The current auth user (validated). Cached per request. */
export const currentUser = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("firebase_session")?.value;

  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return {
      id: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    return null;
  }
});

/** The current user's profile joined with its campus. Cached. */
export const myProfileWithCampus = cache(async (): Promise<
  (Profile & { campus?: Campus | null }) | null
> => {
  const user = await currentUser();
  if (!user) return null;

  try {
    const profileDoc = await adminDb.collection("profiles").doc(user.id).get();
    if (!profileDoc.exists) return null;

    const profile = profileDoc.data() as Profile;

    let campus: Campus | null = null;
    if (profile.campus_id) {
      const campusDoc = await adminDb.collection("campuses").doc(profile.campus_id).get();
      if (campusDoc.exists) {
        campus = { id: campusDoc.id, ...campusDoc.data() } as Campus;
      }
    }

    return { ...profile, campus };
  } catch (error) {
    console.error("Error fetching profile", error);
    return null;
  }
});

/** The current user's profile (server-side). Cached. */
export const myProfile = cache(async (): Promise<Profile | null> => {
  const p = await myProfileWithCampus();
  return p ?? null;
});

/** The current user's campus (for live branding). Cached. */
export const myCampus = cache(async (): Promise<Campus | null> => {
  const p = await myProfileWithCampus();
  return p?.campus ?? null;
});
