import { createClient } from "@/lib/supabase/server";
import { myProfileWithCampus } from "@/lib/db/server-helpers";
import { PageContainer } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/misc";
import type { AppNotification } from "@/lib/types/models";
import { Bell, Tag } from "lucide-react";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const profileWithCampus = await myProfileWithCampus();
  const campusId = profileWithCampus?.campus_id;

  // Bug #5 fix: scope notifications to user's own campus
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (campusId) {
    query = query.eq("campus_id", campusId);
  }

  const { data } = await query;
  const items = (data as AppNotification[]) ?? [];

  return (
    <PageContainer max="max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Notifications</h1>
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="h-14 w-14" />} title="No notifications yet" />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <Tag className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-bold text-text">{n.title}</p>
                <p className="text-sm text-text-muted">{n.message}</p>
                <p className="mt-1 text-xs text-text-faint">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

