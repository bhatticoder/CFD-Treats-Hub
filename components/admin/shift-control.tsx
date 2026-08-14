"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, Switch } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

export function ShiftControl({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  async function toggleShift(campus: Campus, value: boolean) {
    setErr(null);
    setLoading((prev) => ({ ...prev, [campus.id]: true }));
    const { error } = await createClient()
      .from("campuses")
      .update({ shift_active: value })
      .eq("id", campus.id);
    setLoading((prev) => ({ ...prev, [campus.id]: false }));
    if (error) setErr(`Failed to update ${campus.name}: ${error.message}`);
    else router.refresh();
  }

  return (
    <Card className="mb-5">
      <CardBody className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-text">Live Shift Control</h3>
            <p className="text-xs text-text-muted">Turn ON to accept live orders from customers</p>
          </div>
        </div>

        {err && <p className="text-sm text-error">{err}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {campuses.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg-muted px-4 py-3">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-text">{c.name}</p>
              </div>
              <Badge tone={c.shift_active ? "success" : "warn"}>
                {c.shift_active ? "OPEN" : "CLOSED"}
              </Badge>
              <Switch
                checked={c.shift_active}
                onChange={(v) => toggleShift(c, v)}
                disabled={loading[c.id]}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
