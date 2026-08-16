"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Campus, Profile } from "@/lib/types/models";

export function ManagersManager({
  managers,
  campuses,
}: {
  managers: Profile[];
  campuses: Campus[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [campusId, setCampusId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<Profile | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  async function add() {
    if (!email.trim() || !campusId) return setError("Email and campus are required");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Service-role Edge Function creates the auth user + manager profile.
    const { data, error } = await supabase.functions.invoke("create-manager", {
      body: { email: email.trim().toLowerCase(), full_name: name.trim(), phone: phone.trim(), campus_id: campusId },
    });
    setBusy(false);
    if (error || (data && (data as { error?: string }).error)) {
      return setError((data as { error?: string })?.error ?? error?.message ?? "Failed");
    }
    setOpen(false);
    setName(""); setEmail(""); setPhone(""); setCampusId("");
    router.refresh();
  }

  function confirmDeactivate(m: Profile) {
    setDeactivateError(null);
    setDeactivating(m);
  }

  async function executeDeactivate() {
    if (!deactivating) return;
    setIsDeactivating(true);
    setDeactivateError(null);
    const { error } = await createClient()
      .from("profiles")
      .update({ is_active: false })
      .eq("id", deactivating.id);
    setIsDeactivating(false);
    if (error) {
      setDeactivateError(`Could not remove: ${error.message}`);
      return;
    }
    setDeactivating(null);
    router.refresh();
  }

  return (
    <PageContainer max="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">Managers</h1>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add manager
        </Button>
      </div>

      {managers.length === 0 ? (
        <p className="py-16 text-center text-text-faint">No managers yet.</p>
      ) : (
        <div className="space-y-3">
          {managers.map((m) => (
            <Card key={m.id}>
              <CardBody className="flex items-center gap-3 p-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-primary font-bold text-on-primary">
                  {(m.full_name ?? "M")[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text">
                    {m.full_name ?? "Manager"}
                    {!m.is_active && <span className="ml-2 text-xs text-error">(inactive)</span>}
                  </p>
                  <p className="text-sm text-text-muted">{m.email}</p>
                  {m.campus_name && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {m.campus_name}
                      </span>
                    </div>
                  )}
                </div>
                {m.is_active && (
                  <button onClick={() => confirmDeactivate(m)} className="p-2 text-error/70 hover:bg-error/10 hover:text-error rounded-xl transition-colors" title="Remove">
                    <UserX className="h-5 w-5" />
                  </button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add manager"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={add}>Add</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Campus</Label>
            <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
              <option value="">Select…</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-text-faint">
            The manager signs in with an email OTP (same as customers). No password needed.
          </p>
          {error && <p className="text-sm text-error mt-4">{error}</p>}
        </div>
      </Modal>

      <Modal
        open={deactivating !== null}
        onClose={() => !isDeactivating && setDeactivating(null)}
        title="Remove Manager"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeactivating(null)} disabled={isDeactivating}>Cancel</Button>
            <Button variant="danger" loading={isDeactivating} onClick={executeDeactivate}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to remove &quot;{deactivating?.full_name ?? deactivating?.email}&quot;? They will be signed out and blocked from logging in.
        </p>
        {deactivateError && <p className="text-sm text-error mt-4">{deactivateError}</p>}
      </Modal>
    </PageContainer>
  );
}
