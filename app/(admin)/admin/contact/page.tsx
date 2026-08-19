import { createClient } from "@/lib/supabase/server";
import { ContactManager } from "@/components/admin/contact-manager";
import type { Campus } from "@/lib/types/models";

export default async function ContactPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campuses")
    .select("*")
    .order("name");
  return <ContactManager campuses={data as Campus[]} />;
}
