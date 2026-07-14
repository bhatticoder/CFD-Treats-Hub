"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch, Badge } from "@/components/ui/misc";
import type { Restaurant } from "@/lib/types/models";

export function RestaurantsManager({
  restaurants,
  campusId,
}: {
  restaurants: Restaurant[];
  campusId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await createClient().from("restaurants").insert({ campus_id: campusId, name: name.trim() });
    setBusy(false);
    setName("");
    router.refresh();
  }
  async function toggle(r: Restaurant) {
    await createClient().from("restaurants").update({ is_active: !r.is_active }).eq("id", r.id);
    router.refresh();
  }

  return (
    <PageContainer max="max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold text-text">Restaurants</h1>
      <p className="mb-5 text-sm text-text-muted">
        Sources you buy from. Assign items to a restaurant so pre-orders group correctly.
      </p>

      <Card className="mb-5">
        <CardBody className="flex gap-2">
          <Input placeholder="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button loading={busy} onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </Button>
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
                <p className="flex-1 font-semibold text-text">{r.name}</p>
                <Badge tone={r.is_active ? "success" : "neutral"}>
                  {r.is_active ? "Active" : "Hidden"}
                </Badge>
                <Switch checked={r.is_active} onChange={() => toggle(r)} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
