"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Power, ArrowRight } from "lucide-react";
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
  const targetCampus = campus ?? list[0] ?? null;
  const [active, setActive] = useState(targetCampus?.shift_active ?? true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (targetCampus?.shift_active !== undefined) {
      setActive(targetCampus.shift_active);
    }
  }, [targetCampus?.shift_active]);

  async function toggleShift(value: boolean) {
    setLoading(true);
    setErr(null);
    setActive(value);

    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: targetCampus?.id ?? null, shiftActive: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update shift");
      router.refresh();
    } catch (e) {
      setActive(!value);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = (
    <Badge tone={active ? "success" : "warn"}>
      {active ? "Live Shift OPEN" : "ALL FINISHED FOR TODAY"}
    </Badge>
  );

  return (
    <Card className="mb-4">
      <CardBody className="flex items-center gap-3 p-4 sm:p-5">
        <Power className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text">Live Shift (Ordering)</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {statusBadge}
            {targetCampus?.name && (
              <span className="text-xs text-text-muted">({targetCampus.name})</span>
            )}
          </div>
        </div>
        <Switch checked={active} onChange={toggleShift} disabled={loading} />
        <Link
          href="/admin/shift"
          className="flex items-center gap-1 text-sm font-medium text-primary shrink-0"
        >
          Manage <ArrowRight className="h-4 w-4" />
        </Link>
      </CardBody>
      {err && <p className="px-5 pb-3 text-xs text-error">{err}</p>}
    </Card>
  );
}
