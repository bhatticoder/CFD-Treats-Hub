"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/types/models";

export function ManagerDiscounts({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function apply(item: Item, value: number | null) {
    setBusy(item.id);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("manager_set_discount", {
      p_item_id: item.id,
      p_discounted: value,
    });
    setBusy(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  return (
    <PageContainer max="max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Discounts</h1>
      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardBody className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{item.name}</p>
                <p className="text-sm">
                  <span className={item.discounted_price != null ? "text-text-faint line-through" : "text-primary font-bold"}>
                    {money(item.price)}
                  </span>
                  {item.discounted_price != null && (
                    <span className="ml-2 font-bold text-success">
                      {money(item.discounted_price)}
                    </span>
                  )}
                </p>
              </div>
              <Input
                className="w-28"
                inputMode="numeric"
                placeholder="New price"
                value={drafts[item.id] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [item.id]: e.target.value.replace(/\D/g, "") }))
                }
              />
              <Button
                size="sm"
                loading={busy === item.id}
                onClick={() => {
                  const v = Number(drafts[item.id]);
                  if (!v || v >= item.price) return setError("Discount must be lower than price");
                  apply(item, v);
                }}
              >
                Apply
              </Button>
              {item.discounted_price != null && (
                <Button size="sm" variant="ghost" onClick={() => apply(item, null)}>
                  Remove
                </Button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
