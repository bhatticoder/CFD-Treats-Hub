"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch, Badge } from "@/components/ui/misc";
import type { Campus } from "@/lib/types/models";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PreorderControl({
  campus,
  compact = false,
}: {
  campus: Campus;
  compact?: boolean;
}) {
  const router = useRouter();
  const [manual, setManual] = useState(campus.preorder_open);
  const [opensAt, setOpensAt] = useState(toLocalInput(campus.preorder_opens_at));
  const [closesAt, setClosesAt] = useState(toLocalInput(campus.preorder_closes_at));
  const [whatsapp, setWhatsapp] = useState(campus.whatsapp_number ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const scheduledOpen =
    !!opensAt &&
    Date.now() >= new Date(opensAt).getTime() &&
    (!closesAt || Date.now() <= new Date(closesAt).getTime());
  const effectiveOpen = manual || scheduledOpen;

  async function update(patch: Record<string, unknown>) {
    const { error } = await createClient().from("campuses").update(patch).eq("id", campus.id);
    if (error) setMsg(error.message);
    else router.refresh();
  }

  async function toggleManual(v: boolean) {
    setManual(v);
    setMsg(null);
    await update({ preorder_open: v });
  }

  async function saveSchedule() {
    setSaving(true);
    setMsg(null);
    await update({
      preorder_opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      preorder_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      whatsapp_number: whatsapp.trim() || null,
    });
    setSaving(false);
    setMsg("Saved");
  }

  const statusBadge = (
    <Badge tone={effectiveOpen ? "success" : "neutral"}>
      {effectiveOpen ? "Pre-orders OPEN" : "Pre-orders CLOSED"}
    </Badge>
  );

  if (compact) {
    return (
      <Card>
        <CardBody className="flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="font-semibold text-text">Pre-orders</p>
            <div className="mt-1">{statusBadge}</div>
          </div>
          <Switch checked={manual} onChange={toggleManual} />
          <Link
            href="/admin/preorders"
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            Manage <ArrowRight className="h-4 w-4" />
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-text">Activate pre-orders</p>
            <div className="mt-1">{statusBadge}</div>
          </div>
          <Switch checked={manual} onChange={toggleManual} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-text">Or schedule a window</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Opens at</Label>
              <Input
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </div>
            <div>
              <Label>Closes at (optional)</Label>
              <Input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-text-faint">
            Leave the switch off and set a window to auto open/close by time.
            Leave “Closes at” empty to stay open until you turn it off.
          </p>
        </div>

        <div>
          <Label>WhatsApp number (shown to customers when closed)</Label>
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+92 300 1234567"
          />
        </div>

        {msg && <p className="text-sm text-text-muted">{msg}</p>}
        <Button loading={saving} onClick={saveSchedule}>
          Save schedule &amp; contact
        </Button>
      </CardBody>
    </Card>
  );
}
