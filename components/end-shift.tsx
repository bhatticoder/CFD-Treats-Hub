"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Banknote, CreditCard, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EndShift({
  summary,
}: {
  summary: { delivered: number; cod: number; prepaid: number; pending: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function end() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("end_shift");
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    // Lock the manager out until the next shift.
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <PageContainer max="max-w-lg">
      <h1 className="text-2xl font-extrabold text-text">End of Shift</h1>
      <p className="mb-5 text-sm text-text-muted">Tonight&apos;s summary</p>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<CheckCircle2 className="text-success" />} label="Delivered" value={`${summary.delivered}`} />
        <Stat icon={<Clock className="text-error" />} label="Pending" value={`${summary.pending}`} />
        <Stat icon={<Banknote className="text-warn" />} label="COD cash" value={money(summary.cod)} />
        <Stat icon={<CreditCard className="text-success" />} label="Pre-paid" value={money(summary.prepaid)} />
      </div>

      {summary.pending > 0 && (
        <div className="mt-4 rounded-xl bg-warn/10 p-3 text-sm text-text">
          You still have {summary.pending} undelivered order(s). Deliver them before ending your shift.
        </div>
      )}

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      {!confirming ? (
        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={summary.pending > 0}
          onClick={() => setConfirming(true)}
        >
          Confirm End Shift
        </Button>
      ) : (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4">
          <p className="mb-3 text-center text-sm">
            This closes ordering (customers see “ALL FINISHED”) and logs you out. Sure?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button className="flex-1" loading={busy} onClick={end}>
              End Shift
            </Button>
          </div>
        </div>
      )}
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
