import { myCampus } from "@/lib/db/server-helpers";
import { CategoryManager } from "@/components/admin/category-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const campus = await myCampus();
  if (!campus) return null;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("item_categories")
    .select("*")
    .eq("campus_id", campus.id)
    .order("created_at", { ascending: false });

  return <CategoryManager campusId={campus.id} categories={categories || []} />;
}
