import { myProfile } from "@/lib/db/server-helpers";
import { Reports } from "@/components/admin/reports";

export default async function ReportsPage() {
  const profile = await myProfile();
  return <Reports campusId={profile?.campus_id ?? ""} />;
}
