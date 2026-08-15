"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCampusPreorderState(campusId: string, patch: Record<string, unknown>) {
  const supabase = await createClient();
  
  // RLS will enforce admin/manager roles, but we also ensure a logged in user.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("campuses")
    .update(patch)
    .eq("id", campusId)
    .select();

  if (error) {
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Update failed: Row Level Security blocked the update or campus not found." };
  }

  revalidatePath("/admin/preorders");
  revalidatePath("/preorder");
  return { success: true };
}
