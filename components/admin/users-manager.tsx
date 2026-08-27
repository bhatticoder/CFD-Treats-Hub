"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { Campus, Profile } from "@/lib/types/models";

export function UsersManager({
  students,
  campuses,
}: {
  students: Profile[];
  campuses: Campus[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [campusId, setCampusId] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing || !campusId) return;
    setBusy(true);
    await createClient().from("profiles").update({ campus_id: campusId }).eq("id", editing.id);
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Users</h1>
      <p className="mb-5 text-sm text-text-muted">{students.length} registered students</p>

      <div className="space-y-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardBody className="flex items-center gap-3 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-primary font-bold text-on-primary">
                {(s.full_name ?? "S")[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-text">{s.full_name ?? "Student"}</p>
                <p className="text-sm text-text-muted">{s.email}</p>
                <p className="text-xs text-text-faint">
                  {s.campus_name ?? "—"} · {s.room_number ?? "?"} {s.block ?? ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(s);
                  setCampusId(s.campus_id ?? "");
                }}
              >
                Change campus
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Reassign campus`}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={busy} onClick={save}>Save</Button>
          </>
        }
      >
        <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
          <option value="">Select…</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Modal>
    </PageContainer>
  );
}
