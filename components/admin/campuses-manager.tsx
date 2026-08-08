"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GENDERS, DEFAULT_DOMAIN_SUFFIX } from "@/lib/domain/constants";
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
  const [editing, setEditing] = useState<Campus | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(DEFAULT_DOMAIN_SUFFIX);
  const [gender, setGender] = useState<string>("Male");
  const [codCap, setCodCap] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setName("");
    setDomain(DEFAULT_DOMAIN_SUFFIX);
    setGender("Male");
    setCodCap("100");
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Campus) {
    setEditing(c);
    setName(c.name);
    setDomain(c.domain_suffix || DEFAULT_DOMAIN_SUFFIX);
    setGender(c.gender || "Male");
    setCodCap(String(c.cod_cap_percent ?? 100));
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!name.trim() || !domain.trim()) return setError("Name and domain suffix are required");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      domain_suffix: domain.trim().toLowerCase(),
      gender: gender as "Male" | "Female",
      cod_cap_percent: Number(codCap) || 100,
    };

    const { error: err } = editing
      ? await supabase.from("campuses").update(payload).eq("id", editing.id)
      : await supabase.from("campuses").insert({ ...payload, is_active: true });

    setBusy(false);
    if (err) return setError(err.message);
    setOpen(false);
    router.refresh();
  }

  async function del(campus: Campus) {
    if (!confirm(`Delete "${campus.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    const { error } = await createClient().from("campuses").delete().eq("id", campus.id);
    if (error) {
      setDeleteError(`Cannot delete "${campus.name}": ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <PageContainer max="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">Campuses</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add campus
        </Button>
      </div>

      {deleteError && (
        <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{deleteError}</p>
      )}

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
              <button
                onClick={() => openEdit(c)}
                className="p-2 text-primary hover:bg-primary-soft/50 rounded-lg"
                title="Edit campus"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => del(c)}
                className="p-2 text-error hover:bg-error/10 rounded-lg"
                title="Delete campus"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit campus" : "Add campus"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={save}>{editing ? "Update" : "Add"}</Button>
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
