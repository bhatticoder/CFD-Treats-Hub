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

export function AdminCharges({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(campuses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const campus = campuses.find((c) => c.id === selectedId);

  // States
  const [regDel, setRegDel] = useState(String(campus?.regular_delivery_fee ?? 0));
  const [regPlat, setRegPlat] = useState(String(campus?.regular_platform_fee ?? 5));
  const [regGst, setRegGst] = useState(String(campus?.regular_gst ?? 5));
  const [regCod, setRegCod] = useState(String(campus?.regular_cod_charge ?? 30));

  const [preDel, setPreDel] = useState(String(campus?.preorder_delivery_fee ?? 0));
  const [prePlat, setPrePlat] = useState(String(campus?.preorder_platform_fee ?? 5));
  const [preGst, setPreGst] = useState(String(campus?.preorder_gst ?? 5));
  const [preCod, setPreCod] = useState(String(campus?.preorder_cod_charge ?? 30));

  function handleSelect(id: string) {
    setSelectedId(id);
    const c = campuses.find((x) => x.id === id);
    if (c) {
      setRegDel(String(c.regular_delivery_fee ?? 0));
      setRegPlat(String(c.regular_platform_fee ?? 5));
      setRegGst(String(c.regular_gst ?? 5));
      setRegCod(String(c.regular_cod_charge ?? 30));

      setPreDel(String(c.preorder_delivery_fee ?? 0));
      setPrePlat(String(c.preorder_platform_fee ?? 5));
      setPreGst(String(c.preorder_gst ?? 5));
      setPreCod(String(c.preorder_cod_charge ?? 30));
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
        regular_delivery_fee: Number(regDel) || 0,
        regular_platform_fee: Number(regPlat) || 0,
        regular_gst: Number(regGst) || 0,
        regular_cod_charge: Number(regCod) || 0,
        preorder_delivery_fee: Number(preDel) || 0,
        preorder_platform_fee: Number(prePlat) || 0,
        preorder_gst: Number(preGst) || 0,
        preorder_cod_charge: Number(preCod) || 0,
      };

      const { error: err } = await createClient()
        .from("campuses")
        .update(payload)
        .eq("id", selectedId);

      if (err) throw err;
      setSuccess("Charges updated successfully!");
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
    <PageContainer max="max-w-4xl">
      <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text">Charges & Fees</h1>
          <p className="text-sm text-text-muted mt-1">Configure flat delivery, platform fees, GST and COD charges globally per campus.</p>
        </div>
        <Button loading={busy} onClick={save}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-bold text-text">Regular Orders (Menu Items)</h2>
            <p className="text-xs text-text-muted">These flat charges apply to standard inventory orders.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Fee (Flat)</Label>
                <Input inputMode="numeric" value={regDel} onChange={(e) => setRegDel(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>Platform Fee (Flat)</Label>
                <Input inputMode="numeric" value={regPlat} onChange={(e) => setRegPlat(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>GST (%)</Label>
                <Input inputMode="numeric" value={regGst} onChange={(e) => setRegGst(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>COD Extra Charge</Label>
                <Input inputMode="numeric" value={regCod} onChange={(e) => setRegCod(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-bold text-text">Pre-orders</h2>
            <p className="text-xs text-text-muted">These flat charges apply only to pre-orders.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Delivery Fee (Flat)</Label>
                <Input inputMode="numeric" value={preDel} onChange={(e) => setPreDel(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>Platform Fee (Flat)</Label>
                <Input inputMode="numeric" value={prePlat} onChange={(e) => setPrePlat(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>GST (%)</Label>
                <Input inputMode="numeric" value={preGst} onChange={(e) => setPreGst(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <Label>COD Extra Charge</Label>
                <Input inputMode="numeric" value={preCod} onChange={(e) => setPreCod(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
