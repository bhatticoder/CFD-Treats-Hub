"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store, Trash } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch, Badge } from "@/components/ui/misc";
import type { Restaurant } from "@/lib/types/models";

export function RestaurantsManager({
  restaurants,
  campuses,
}: {
  restaurants: Restaurant[];
  campuses: import("@/lib/types/models").Campus[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [campusId, setCampusId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return setError("Name is required");
    if (!campusId) return setError("Campus is required");
    setBusy(true);
    setError(null);
    const { error: insertErr } = await createClient().from("restaurants").insert({ campus_id: campusId, name: name.trim() });
    setBusy(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setName("");
    router.refresh();
  }
  async function toggle(r: Restaurant) {
    await createClient().from("restaurants").update({ is_active: !r.is_active }).eq("id", r.id);
    router.refresh();
  }
  
  async function remove(id: string) {
    setBusy(true);
    await createClient().from("restaurants").delete().eq("id", id);
    setDeletingId(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
    <PageContainer max="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Restaurants</h1>
      <p className="mb-5 text-sm text-text-muted">
        Sources you buy from. Assign items to a restaurant so pre-orders group correctly.
      </p>

      <Card className="mb-5">
        <CardBody>
          <div className="flex gap-2">
            <Input placeholder="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} />
            <select
              className="h-11 rounded-xl border border-border bg-surface px-4 text-sm focus:border-primary focus:outline-none"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
            >
              <option value="">Select Campus</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button loading={busy} onClick={add}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </CardBody>
      </Card>

      {restaurants.length === 0 ? (
        <p className="py-10 text-center text-text-faint">No restaurants yet.</p>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => (
            <Card key={r.id}>
              <CardBody className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Store className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-text">{r.name}</p>
                  <p className="text-xs text-text-muted">{campuses.find((c) => c.id === r.campus_id)?.name ?? "Unknown Campus"}</p>
                </div>
                <Badge tone={r.is_active ? "success" : "neutral"}>
                  {r.is_active ? "Active" : "Hidden"}
                </Badge>
                <Switch checked={r.is_active} onChange={() => toggle(r)} />
                <button
                  onClick={() => setDeletingId(r.id)}
                  className="ml-2 grid h-8 w-8 place-items-center rounded-xl bg-error/10 text-error hover:bg-error/20"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
    
    {deletingId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl">
          <h3 className="mb-2 text-lg font-bold text-text">Delete Restaurant?</h3>
          <p className="mb-6 text-sm text-text-muted">
            Are you sure you want to delete this restaurant? Items assigned to it will become unassigned.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => remove(deletingId)}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
