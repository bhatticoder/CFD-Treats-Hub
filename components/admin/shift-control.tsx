"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Power, ArrowRight, Building2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, Switch } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

export function ShiftControl({
  campus,
  campuses,
}: {
  campus?: Campus | null;
  campuses?: Campus[];
}) {
  const router = useRouter();
  const list = campuses ?? (campus ? [campus] : []);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  async function toggleShift(targetCampus: Campus, value: boolean) {
    setLoading((prev) => ({ ...prev, [targetCampus.id]: true }));
    setErr(null);

    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: targetCampus.id, shiftActive: value }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
      }
      if (!res.ok) throw new Error(data.error || "Failed to update shift");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading((prev) => ({ ...prev, [targetCampus.id]: false }));
    }
  }

  if (list.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardBody className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary shrink-0" />
            <p className="font-bold text-text">Live Shift Control (Admin Only)</p>
          </div>
          <Link
            href="/admin/shift"
            className="flex items-center gap-1 text-sm font-medium text-primary shrink-0"
          >
            All Shifts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {err && <p className="text-xs text-error">{err}</p>}

        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-muted p-3"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Building2 className="h-4 w-4 text-text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text truncate">{c.name}</p>
                  <Badge tone={c.shift_active ? "success" : "warn"}>
                    {c.shift_active ? "OPEN" : "ALL FINISHED"}
                  </Badge>
                </div>
              </div>
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

