"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, Trash2, Pencil, CalendarClock, Truck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GENDERS, DEFAULT_DOMAIN_SUFFIX } from "@/lib/domain/constants";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge, Switch } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import type { Campus } from "@/lib/types/models";

export function CampusesManager({ campuses }: { campuses: Campus[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(DEFAULT_DOMAIN_SUFFIX);
  const [gender, setGender] = useState<string>("Male");
  const [halls, setHalls] = useState("");
  const [codCap, setCodCap] = useState("100");
  const [deliveryActive, setDeliveryActive] = useState(true);
  const [collectionRoom, setCollectionRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Campus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Per-campus preorder toggle state: { [campusId]: boolean }
  const [preorderLoading, setPreorderLoading] = useState<Record<string, boolean>>({});

  const [campusDelivOpen, setCampusDelivOpen] = useState(false);
  const [campusDelivTarget, setCampusDelivTarget] = useState<Campus | null>(null);
  const [campusDelivActive, setCampusDelivActive] = useState(false);
  const [campusDelivRoom, setCampusDelivRoom] = useState("");
  const [campusDelivBusy, setCampusDelivBusy] = useState(false);

  async function applyCampusDelivery() {
    if (!campusDelivTarget) return;
    setCampusDelivBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("campuses").update({ 
      delivery_active: campusDelivActive, 
      collection_room: campusDelivActive ? null : campusDelivRoom.trim() 
    }).eq("id", campusDelivTarget.id);
    
    if (error) {
      setCampusDelivBusy(false);
      alert("Failed to update delivery settings: " + error.message);
      return;
    }
    
    setCampusDelivBusy(false);
    setCampusDelivOpen(false);
    setCampusDelivTarget(null);
    router.refresh();
  }

  function openDeliveryOptions(c: Campus) {
    setCampusDelivTarget(c);
    setCampusDelivActive(c.delivery_active ?? true);
    setCampusDelivRoom(c.collection_room || "");
    setCampusDelivOpen(true);
  }


  function openNew() {
    setEditing(null);
    setName("");
    setDomain(DEFAULT_DOMAIN_SUFFIX);
    setGender("Male");
    setHalls("");
    setCodCap("100");
    setDeliveryActive(true);
    setCollectionRoom("");
    setError(null);
    setOpen(true);
  }

  function openEdit(c: Campus) {
    setEditing(c);
    setName(c.name);
    setDomain(c.domain_suffix || DEFAULT_DOMAIN_SUFFIX);
    setGender(c.gender || "Male");
    setHalls(c.halls ? c.halls.join(", ") : "");
    setCodCap(String(c.cod_cap_percent ?? 100));
    setDeliveryActive(c.delivery_active ?? true);
    setCollectionRoom(c.collection_room || "");
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
      halls: halls.split(",").map(h => h.trim()).filter(h => h.length > 0),
      cod_cap_percent: Number(codCap) || 100,
      delivery_active: deliveryActive,
      collection_room: !deliveryActive ? collectionRoom.trim() : null,
    };

    const { error: err } = editing
      ? await supabase.from("campuses").update(payload).eq("id", editing.id)
      : await supabase.from("campuses").insert({ ...payload, is_active: true });

    setBusy(false);
    if (err) return setError(err.message);
    setOpen(false);
    router.refresh();
  }

  function confirmDelete(campus: Campus) {
    setDeleteError(null);
    setDeleting(campus);
  }

  async function executeDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await createClient().from("campuses").delete().eq("id", deleting.id);
    setIsDeleting(false);
    if (error) {
      setDeleteError(`Cannot delete "${deleting.name}": ${error.message}`);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  const [shiftLoading, setShiftLoading] = useState<Record<string, boolean>>({});
  const [toggleErr, setToggleErr] = useState<string | null>(null);

  async function togglePreorder(campus: Campus, value: boolean) {
    setToggleErr(null);
    setPreorderLoading((prev) => ({ ...prev, [campus.id]: true }));
    const { error } = await createClient()
      .from("campuses")
      .update({ preorder_open: value })
      .eq("id", campus.id);
    setPreorderLoading((prev) => ({ ...prev, [campus.id]: false }));
    if (error) setToggleErr(`Failed to update preorders for ${campus.name}: ${error.message}`);
    else router.refresh();
  }

  async function toggleShift(campus: Campus, value: boolean) {
    setToggleErr(null);
    setShiftLoading((prev) => ({ ...prev, [campus.id]: true }));
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: campus.id, shiftActive: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update shift");
      router.refresh();
    } catch (e) {
      setToggleErr(`Failed to update shift for ${campus.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setShiftLoading((prev) => ({ ...prev, [campus.id]: false }));
    }
  }

  async function openAllShifts(value: boolean) {
    setToggleErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campusId: null, shiftActive: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update all shifts");
      router.refresh();
    } catch (e) {
      setToggleErr(`Failed to update all shifts: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer max="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-text">Campuses</h1>
          <p className="text-sm text-text-muted">Manage hostel campuses & live shift status</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openAllShifts(true)}>
            Open All Shifts
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add campus
          </Button>
        </div>
      </div>

      {toggleErr && (
        <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{toggleErr}</p>
      )}

      {deleteError && (
        <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{deleteError}</p>
      )}

      <div className="space-y-3">
        {campuses.map((c) => (
          <Card key={c.id}>
            <CardBody className="p-4 space-y-3">
              {/* Campus info row */}
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text">{c.name}</p>
                  <p className="text-sm text-text-muted">
                    {c.domain_suffix} · {c.gender} · COD cap {c.cod_cap_percent}% · Delivery {c.delivery_active ? "ON" : "OFF"}
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
                <button onClick={() => confirmDelete(c)} className="p-2 text-error/70 hover:bg-error/10 hover:text-error rounded-xl transition-colors">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {/* Shift status & Pre-orders toggle rows */}
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-muted px-4 py-2.5">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">Live Shift</p>
                  </div>
                  <Badge tone={c.shift_active ? "success" : "warn"}>
                    {c.shift_active ? "OPEN" : "CLOSED"}
                  </Badge>
                  <Switch
                    checked={c.shift_active}
                    onChange={(v) => toggleShift(c, v)}
                    disabled={shiftLoading[c.id]}
                  />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-muted px-4 py-2.5">
                  <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">Pre-orders</p>
                  </div>
                  <Badge tone={c.preorder_open ? "success" : "neutral"}>
                    {c.preorder_open ? "OPEN" : "CLOSED"}
                  </Badge>
                  <Switch
                    checked={c.preorder_open}
                    onChange={(v) => togglePreorder(c, v)}
                    disabled={preorderLoading[c.id]}
                  />
                </div>

                <button
                  onClick={() => openDeliveryOptions(c)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-bg-muted px-4 py-2.5 hover:bg-bg-subtle transition-colors"
                >
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-text">Delivery</p>
                    {c.delivery_active ? (
                      <p className="text-xs text-text-muted">Active</p>
                    ) : (
                      <p className="text-xs text-error font-medium truncate">Pickup: {c.collection_room}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                </button>
              </div>
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
          <div>
            <Label>Halls / Blocks</Label>
            <Input value={halls} onChange={(e) => setHalls(e.target.value)} placeholder="e.g. Iqbal, Jinnah" />
            <p className="mt-1 text-xs text-text-muted">Comma-separated list of blocks or halls</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-bg-muted p-3">
            <div>
              <Label className="mb-0">Delivery Active</Label>
              <p className="text-xs text-text-muted">Turn off to enable self-pickup</p>
            </div>
            <Switch checked={deliveryActive} onChange={setDeliveryActive} disabled={false} />
          </div>
          {!deliveryActive && (
            <div>
              <Label>Collection Room</Label>
              <Input
                value={collectionRoom}
                onChange={(e) => setCollectionRoom(e.target.value)}
                placeholder="e.g. Room 102"
              />
            </div>
          )}
          {error && <p className="text-sm text-error mt-2">{error}</p>}
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => !isDeleting && setDeleting(null)}
        title="Delete Campus"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" loading={isDeleting} onClick={executeDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to delete &quot;{deleting?.name}&quot;? This cannot be undone.
        </p>
        {deleteError && <p className="text-sm text-error mt-4">{deleteError}</p>}
      </Modal>

      <Modal
        open={campusDelivOpen}
        onClose={() => setCampusDelivOpen(false)}
        title={`Delivery Options (${campusDelivTarget?.name})`}
        footer={
          <>
            <Button variant="outline" onClick={() => setCampusDelivOpen(false)}>Cancel</Button>
            <Button loading={campusDelivBusy} onClick={applyCampusDelivery}>Apply</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Configure delivery settings for this campus. 
            If you turn Delivery off, customers will be asked to pick up their orders from the room you specify.
          </p>
          <div className="flex items-center justify-between rounded-xl border border-border bg-bg-muted p-3">
            <div>
              <Label className="mb-0">Delivery Active</Label>
              <p className="text-xs text-text-muted">Turn off to force self-pickup</p>
            </div>
            <Switch checked={campusDelivActive} onChange={setCampusDelivActive} disabled={false} />
          </div>
          {!campusDelivActive && (
            <div>
              <Label>Collection Room / Hall Name</Label>
              <Input
                value={campusDelivRoom}
                onChange={(e) => setCampusDelivRoom(e.target.value)}
                placeholder="e.g. Room 102, Boys Hall"
              />
            </div>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
