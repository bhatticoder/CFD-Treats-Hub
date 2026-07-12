"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import type { Campus, Item } from "@/lib/types/models";

export function AdminDiscounts({ campus, items }: { campus: Campus; items: Item[] }) {
  const router = useRouter();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleManagerDiscount(v: boolean) {
    await createClient().from("campuses").update({ manager_discount_enabled: v }).eq("id", campus.id);
    router.refresh();
  }

  async function setDiscount(item: Item, value: number | null) {
    setBusy(item.id);
    await createClient().from("items").update({ discounted_price: value }).eq("id", item.id);
    setBusy(null);
    router.refresh();
  }

  async function sendNotification() {
    if (!title.trim() || !message.trim()) return;
    await createClient().from("notifications").insert({
      campus_id: campus.id,
      title: title.trim(),
      message: message.trim(),
    });
    setNotifyOpen(false);
    setTitle(""); setMessage("");
  }

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Discounts</h1>

      <Card className="mb-4">
        <CardBody className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-text">Allow managers to set discounts</p>
            <p className="text-sm text-text-muted">When off, only you can apply discounts.</p>
          </div>
          <Switch checked={campus?.manager_discount_enabled ?? false} onChange={toggleManagerDiscount} />
        </CardBody>
      </Card>

      <Button variant="outline" className="mb-5 w-full" onClick={() => setNotifyOpen(true)}>
        <Megaphone className="h-4 w-4" /> Send notification to customers
      </Button>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardBody className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{item.name}</p>
                <p className="text-sm">
                  <span className={item.discounted_price != null ? "text-text-faint line-through" : "font-bold text-primary"}>
                    {money(item.price)}
                  </span>
                  {item.discounted_price != null && (
                    <span className="ml-2 font-bold text-success">{money(item.discounted_price)}</span>
                  )}
                </p>
              </div>
              <Input
                className="w-28"
                inputMode="numeric"
                placeholder="New price"
                value={drafts[item.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value.replace(/\D/g, "") }))}
              />
              <Button
                size="sm"
                loading={busy === item.id}
                onClick={() => {
                  const v = Number(drafts[item.id]);
                  if (v && v < item.price) setDiscount(item, v);
                }}
              >
                Apply
              </Button>
              {item.discounted_price != null && (
                <Button size="sm" variant="ghost" onClick={() => setDiscount(item, null)}>Remove</Button>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title="Send notification"
        footer={
          <>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancel</Button>
            <Button onClick={sendNotification}>Send</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} /></div>
        </div>
      </Modal>
    </PageContainer>
  );
}
