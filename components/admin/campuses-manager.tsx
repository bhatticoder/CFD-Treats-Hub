"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GENDERS } from "@/lib/domain/constants";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import type { Campus } from "@/lib/types/models";

export function CampusesManager({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("@");
  const [gender, setGender] = useState<string>("Male");
  const [codCap, setCodCap] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim() || !domain.trim()) return setError("Name and domain are required");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("campuses").insert({
      name: name.trim(),
      domain_suffix: domain.trim().toLowerCase(),
      gender,
      cod_cap_percent: Number(codCap) || 100,
      is_active: true,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setOpen(false);
    setName(""); setDomain("@"); setGender("Male"); setCodCap("100");
    router.refresh();
  }

  return (
    <PageContainer max="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">Campuses</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add campus
        </Button>
      </div>

      <div className="space-y-3">
        {campuses.map((c) => (
          <Card key={c.id}>
            <CardBody className="flex items-center gap-3 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">{c.name}</p>
                <p className="text-sm text-text-muted">
                  {c.domain_suffix} · {c.gender} · COD cap {c.cod_cap_percent}%
                </p>
              </div>
              <Badge tone={c.shift_active ? "success" : "warn"}>
                {c.shift_active ? "Shift open" : "Closed"}
              </Badge>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add campus"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={add}>Add</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CFD Campus (Boys)" /></div>
          <div><Label>Email domain suffix</Label><Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="@cfd.nu.edu.pk" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gender</Label>
              <Select value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </Select>
            </div>
            <div>
              <Label>COD cap %</Label>
              <Input inputMode="numeric" value={codCap} onChange={(e) => setCodCap(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </Modal>
    </PageContainer>
  );
}
