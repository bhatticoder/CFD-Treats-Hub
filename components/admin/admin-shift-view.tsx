"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Power, Building2 } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Switch } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

export function AdminShiftView({ campuses: initialCampuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [campuses, setCampuses] = useState(initialCampuses);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [controlBusy, setControlBusy] = useState<Record<string, boolean>>({});
  const [globalBusy, setGlobalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh to see live changes if a manager toggles their shift
  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);
  
  // Sync state if it was refreshed from server
  useEffect(() => {
    setCampuses(initialCampuses);
  }, [initialCampuses]);

  async function updateShift(campusId: string | null, value: boolean) {
    setError(null);
    if (campusId) {
      setBusy((prev) => ({ ...prev, [campusId]: true }));
    } else {
      setGlobalBusy(true);
    }

    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId, shiftActive: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update shift");

      setCampuses((prev) =>
        prev.map((c) =>
          campusId === null || c.id === campusId ? { ...c, shift_active: value } : c,
        ),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (campusId) {
        setBusy((prev) => ({ ...prev, [campusId]: false }));
      } else {
        setGlobalBusy(false);
      }
    }
  }

  async function updateManagerShiftControl(campusId: string, value: boolean) {
    setError(null);
    setControlBusy((prev) => ({ ...prev, [campusId]: true }));

    try {
      const res = await fetch("/api/shift-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId, enabled: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update permissions");

      setCampuses((prev) =>
        prev.map((c) => (c.id === campusId ? { ...c, manager_shift_control_enabled: value } : c)),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setControlBusy((prev) => ({ ...prev, [campusId]: false }));
    }
  }

  const allOpen = campuses.every((c) => c.shift_active);

  return (
    <PageContainer max="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text">Shift Control</h1>
          <p className="text-sm text-text-muted">
            Open or close live food ordering (ALL FINISHED FOR TODAY) across campuses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={allOpen ? "outline" : "success"}
            loading={globalBusy}
            onClick={() => updateShift(null, !allOpen)}
          >
            <Power className="h-4 w-4" />
            {allOpen ? "Close All Shifts" : "Open All Shifts"}
          </Button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{error}</p>}

      {!allOpen && (
        <div className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 p-5" role="status">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
              <Power className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-extrabold uppercase tracking-wide text-warning">
                ALL FINISHED FOR TODAY
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Ordering is closed for one or more campuses. Turn on a shift to reopen ordering.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {campuses.map((c) => (
          <Card key={c.id}>
            <CardBody className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary font-bold">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-text text-base">{c.name}</p>
                <p className="text-xs text-text-muted">
                  {c.domain_suffix} · {c.gender ?? "All genders"}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-muted">Live Status:</span>
                  <Badge tone={c.shift_active ? "success" : "warn"}>
                    {c.shift_active ? "SHIFT OPEN" : "ALL FINISHED"}
                  </Badge>
                  <Switch
                    checked={c.shift_active}
                    onChange={(v) => updateShift(c.id, v)}
                    disabled={busy[c.id]}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Allow Managers to Toggle:</span>
                  <Switch
                    checked={c.manager_shift_control_enabled}
                    onChange={(v) => updateManagerShiftControl(c.id, v)}
                    disabled={controlBusy[c.id]}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
