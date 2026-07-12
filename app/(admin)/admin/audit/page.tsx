import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/misc";
import type { AuditEntry } from "@/lib/types/models";
import { ScrollText } from "lucide-react";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const logs = (data as AuditEntry[]) ?? [];

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Audit Log</h1>
      <p className="mb-5 text-sm text-text-muted">
        Every price change, stock change, order and delivery — immutable.
      </p>
      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-14 w-14" />} title="No audit entries yet" />
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-start justify-between rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="font-semibold text-text">{l.action}</p>
                {l.detail && JSON.stringify(l.detail) !== "{}" && (
                  <p className="text-xs text-text-muted">{JSON.stringify(l.detail)}</p>
                )}
                <p className="text-xs text-text-faint">
                  {[l.actor_role, l.entity].filter(Boolean).join(" • ")}
                </p>
              </div>
              <span className="shrink-0 text-xs text-text-faint">
                {new Date(l.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
