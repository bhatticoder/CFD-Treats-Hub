import { createClient } from "@/lib/supabase/server";
import type { Campus, Profile } from "@/lib/types/models";

/** The current user's profile (server-side). null if not signed in / no row. */
export async function myProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

/** The current user's campus (for live branding). */
export async function myCampus(): Promise<Campus | null> {
  const profile = await myProfile();
  if (!profile?.campus_id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("campuses")
    .select("*")
    .eq("id", profile.campus_id)
    .maybeSingle();
  return (data as Campus) ?? null;
}
