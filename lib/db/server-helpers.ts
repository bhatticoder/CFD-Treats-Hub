import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Campus, Profile } from "@/lib/types/models";

// `cache()` dedupes within a single request/render: the layout AND the page can
// both call these and the network work happens only once per navigation.

/** The current auth user (validated). Cached per request. */
export const currentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The current user's profile joined with its campus, in ONE query. Cached. */
export const myProfileWithCampus = cache(async (): Promise<
  (Profile & { campus?: Campus | null }) | null
> => {
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*, campuses(*)")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Profile & { campuses?: Campus | Campus[] | null };
  const rawCampus = row.campuses;
  const campus = Array.isArray(rawCampus) ? rawCampus[0] : rawCampus;
  return { ...row, campus: campus ?? null };
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
