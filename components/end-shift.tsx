"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Banknote, CreditCard, Clock, Power } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Switch } from "@/components/ui/misc";
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
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftActive, setShiftActive] = useState(campus?.shift_active ?? true);

  async function toggleShift(value: boolean) {
    if (!campus?.id) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("campuses")
      .update({ shift_active: value })
      .eq("id", campus.id);
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setShiftActive(value);
      router.refresh();
    }
  }

  async function endShiftAndLogout() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (campus?.id) {
      await supabase.from("campuses").update({ shift_active: false }).eq("id", campus.id);
    }
    const { error: rpcErr } = await supabase.rpc("end_shift");
    if (rpcErr && !rpcErr.message.includes("function")) {
      // ignore function missing if table updated
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <PageContainer max="max-w-lg">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text">Shift &amp; Summary</h1>
          <p className="text-sm text-text-muted">Tonight&apos;s shift status and orders summary</p>
        </div>
      </div>

      {/* Live Shift Control Card */}
      <Card className="mb-5 border-2 border-primary/30">
        <CardBody className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 place-items-center rounded-xl font-bold ${
              shiftActive ? "bg-success/20 text-success" : "bg-error/20 text-error"
            }`}>
              <Power className="h-6 w-6" />
            </div>
            <div>
              <p className="font-extrabold text-text">
                {shiftActive ? "Live Shift: OPEN" : "ALL FINISHED FOR TODAY"}
              </p>
              <p className="text-xs text-text-muted">
                {shiftActive
                  ? "Customers can currently order"
                  : "Ordering is currently closed"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={shiftActive ? "success" : "error"}>
              {shiftActive ? "OPEN" : "CLOSED"}
            </Badge>
            <Switch checked={shiftActive} onChange={toggleShift} disabled={busy} />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3">
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

      <div className="mt-6 space-y-3">
        {shiftActive ? (
          !confirming ? (
            <Button
              className="w-full"
              size="lg"
              variant="outline"
              disabled={summary.pending > 0}
              onClick={() => setConfirming(true)}
            >
              Close Shift (Set ALL FINISHED FOR TODAY)
            </Button>
          ) : (
            <div className="rounded-2xl border border-error/40 bg-error/5 p-4">
              <p className="mb-3 text-center text-sm font-semibold text-text">
                Close ordering shift for customers (ALL FINISHED FOR TODAY)?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" loading={busy} onClick={() => toggleShift(false)}>
                  Confirm Close
                </Button>
              </div>
            </div>
          )
        ) : (
          <Button
            className="w-full"
            size="lg"
            variant="success"
            loading={busy}
            onClick={() => toggleShift(true)}
          >
            Start / Re-Open Live Shift
          </Button>
        )}

        <Button
          variant="ghost"
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
