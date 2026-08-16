"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Banknote, CreditCard, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

export function EndShift({
  summary,
  campus,
}: {
  summary: { delivered: number; cod: number; prepaid: number; pending: number };
  campus?: Campus | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftActive, setShiftActive] = useState(campus?.shift_active ?? true);

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (campus) setShiftActive(campus.shift_active);
  }, [campus]);

  async function toggleShift(value: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: campus?.id, shiftActive: value }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server Error: ${res.status} ${res.statusText}`);
      }
      if (!res.ok) throw new Error(data.error || "Failed to update shift");
      setShiftActive(value);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function endShiftAndLogout() {
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: campus?.id, shiftActive: false }),
      });
    } catch {
      // ignore network error on logout
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <PageContainer max="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Shift & Summary</h1>
      <p className="mb-6 text-sm text-text-muted">Tonight&apos;s shift status and orders summary</p>

      {error && <p className="mb-4 text-sm text-error">{error}</p>}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Stat icon={<CheckCircle2 className="text-success" />} label="Delivered" value={`${summary.delivered}`} />
        <Stat icon={<Clock className="text-error" />} label="Pending" value={`${summary.pending}`} />
        <Stat icon={<Banknote className="text-warn" />} label="COD cash" value={money(summary.cod)} />
        <Stat icon={<CreditCard className="text-success" />} label="Pre-paid" value={money(summary.prepaid)} />
      </div>

      {summary.pending > 0 && (
        <div className="mt-4 rounded-xl bg-warn/10 p-3 text-sm text-text">
          You still have {summary.pending} undelivered order(s). Deliver them before closing your shift.
        </div>
      )}

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <div className="mt-6 space-y-4">
        <Card>
          <CardBody className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold text-text">Campus Shift Status</p>
              <p className="text-xs text-text-muted">
                {shiftActive ? "Customers can place orders." : "Ordering is paused."}
              </p>
              {campus && !campus.manager_shift_control_enabled && (
                <p className="mt-1 text-xs text-error font-medium">
                  Controlled by Admin
                </p>
              )}
            </div>
            <Switch
              checked={shiftActive}
              onChange={toggleShift}
              disabled={busy || !!(campus && !campus.manager_shift_control_enabled)}
            />
          </CardBody>
        </Card>

        <Button
          variant="outline"
          className="w-full text-text-muted"
          loading={busy}
          onClick={endShiftAndLogout}
        >
          Logout of Manager Account
        </Button>
      </div>
    </PageContainer>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-bg-muted">{icon}</div>
        <div>
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-lg font-extrabold text-text">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}
