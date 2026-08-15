// Build: 2026-08-14T18:22Z — force fresh deploy
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Power, ArrowRight, Building2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Switch } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

export function ShiftControl({
  campus,
  campuses: initialCampuses,
}: {
  campus?: Campus | null;
  campuses?: Campus[];
}) {
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>(
    initialCampuses && initialCampuses.length > 0
      ? initialCampuses
      : campus
        ? [campus]
        : [],
  );
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [fetchingCampuses, setFetchingCampuses] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Always try to fetch campuses client-side to guarantee they load
  useEffect(() => {
    if (initialCampuses && initialCampuses.length > 0) {
      const t = setTimeout(() => setCampuses(initialCampuses), 0);
      return () => clearTimeout(t);
    }
    // Fallback: fetch all campuses directly from Supabase
    const t2 = setTimeout(() => {
      setFetchingCampuses(true);
      const supabase = createClient();
      supabase
        .from("campuses")
        .select("*")
        .order("name")
        .then(({ data, error }) => {
          if (data && data.length > 0) {
            setCampuses(data as Campus[]);
          }
          if (error) {
            setErr(`Could not load campuses: ${error.message}`);
          }
          setFetchingCampuses(false);
        });
    }, 0);
    return () => clearTimeout(t2);
  }, [initialCampuses]);

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

      setCampuses((prev) =>
        prev.map((c) => (c.id === targetCampus.id ? { ...c, shift_active: value } : c)),
      );
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading((prev) => ({ ...prev, [targetCampus.id]: false }));
    }
  }

  async function toggleAllShifts(value: boolean) {
    setErr(null);
    setLoading(Object.fromEntries(campuses.map((c) => [c.id, true])));
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: null, shiftActive: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCampuses((prev) => prev.map((c) => ({ ...c, shift_active: value })));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading({});
    }
  }

  return (
    <Card className="mb-4">
      <CardBody className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5 text-primary shrink-0" />
            <p className="font-bold text-text">Live Shift Control</p>
          </div>
          <div className="flex items-center gap-2">
            {campuses.length > 0 && (
              <Button
                size="sm"
                variant={campuses.every((c) => c.shift_active) ? "outline" : "success"}
                onClick={() => toggleAllShifts(!campuses.every((c) => c.shift_active))}
              >
                <Power className="h-3.5 w-3.5" />
                {campuses.every((c) => c.shift_active) ? "Close All" : "Open All"}
              </Button>
            )}
            <Link
              href="/admin/shift"
              className="flex items-center gap-1 text-sm font-medium text-primary shrink-0"
            >
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {err && <p className="text-xs text-error">{err}</p>}

        {fetchingCampuses ? (
          <div className="flex items-center gap-2 text-sm text-text-muted py-3">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading campuses…
          </div>
        ) : campuses.length === 0 ? (
          <p className="text-sm text-text-muted py-2">
            No campuses found. Add a campus in the Campuses section first.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {campuses.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-muted p-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="h-4 w-4 text-text-muted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{c.name}</p>
                    <Badge tone={c.shift_active ? "success" : "warn"}>
                      {c.shift_active ? "OPEN" : "CLOSED"}
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
        )}
      </CardBody>
    </Card>
  );
}
