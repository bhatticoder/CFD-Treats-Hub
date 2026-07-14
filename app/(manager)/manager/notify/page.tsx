import { myProfile } from "@/lib/db/server-helpers";
import { SendNotify } from "@/components/send-notify";

export default async function ManagerNotifyPage() {
  const profile = await myProfile();
  return <SendNotify campusId={profile?.campus_id ?? ""} />;
}
