"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { Campus } from "@/lib/types/models";

export function ContactManager({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(campuses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const campus = campuses.find((c) => c.id === selectedId);

  const [whatsapp, setWhatsapp] = useState(campus?.whatsapp_number ?? "");
  const [account, setAccount] = useState(campus?.payment_account_info ?? "");
  const [codCap, setCodCap] = useState(String(campus?.cod_cap_percent ?? 100));

  function handleSelect(id: string) {
    setSelectedId(id);
    const c = campuses.find((x) => x.id === id);
    if (c) {
      setWhatsapp(c.whatsapp_number ?? "");
      setAccount(c.payment_account_info ?? "");
      setCodCap(String(c.cod_cap_percent ?? 100));
    }
    setError(null);
    setSuccess(null);
  }

  async function save() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        whatsapp_number: whatsapp.trim() || null,
        payment_account_info: account.trim() || null,
        cod_cap_percent: Math.min(100, Math.max(0, Number(codCap) || 100)),
      };

      const { error: err } = await createClient()
        .from("campuses")
        .update(payload)
        .eq("id", selectedId);

      if (err) throw err;
      setSuccess("Payment & Contact settings updated successfully!");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (campuses.length === 0) {
    return <PageContainer><p>No campuses found.</p></PageContainer>;
  }

  return (
    <PageContainer max="max-w-xl">
      <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text">Payment & Contact</h1>
          <p className="text-sm text-text-muted mt-1">Configure WhatsApp numbers and payment methods per campus.</p>
        </div>
      </div>

      <div className="mb-6">
        <Label>Select Campus</Label>
        <Select value={selectedId} onChange={(e) => handleSelect(e.target.value)} className="w-full sm:w-72">
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{error}</p>}
      {success && <p className="mb-4 rounded-xl bg-success/10 p-3 text-sm text-success">{success}</p>}

      <Card>
        <CardBody className="space-y-4">
          <div>
            <Label>WhatsApp Number</Label>
            <p className="text-xs text-text-muted mb-2">Customers use this to contact you for pre-orders when pre-orders are closed.</p>
            <Input 
              value={whatsapp} 
              onChange={(e) => setWhatsapp(e.target.value)} 
              placeholder="e.g. 03236232156" 
            />
          </div>
          <div>
            <Label>Payment Method (shown to customers at checkout)</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="e.g. NAYAPAY 03236232156"
            />
          </div>
          <div>
            <Label>COD cap (% of nightly orders)</Label>
            <Input
              inputMode="numeric"
              value={codCap}
              onChange={(e) => setCodCap(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button className="w-full" loading={busy} onClick={save}>
            <Save className="h-4 w-4 mr-2" /> Save Settings
          </Button>
        </CardBody>
      </Card>
    </PageContainer>
  );
}
