"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Upload, Store, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { computeTotals } from "@/lib/domain/pricing";
import { HOSTEL_BLOCKS, COD_EXTRA_CHARGE } from "@/lib/domain/constants";
import { validateRoom } from "@/lib/domain/validators";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import type { CartLine, Item } from "@/lib/types/models";

export function PreorderBrowser({
  items,
  defaultRoom,
  defaultBlock,
  account,
}: {
  items: Item[];
  defaultRoom: string;
  defaultBlock: string;
  account: string | null;
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [room, setRoom] = useState(defaultRoom);
  const [block, setBlock] = useState(defaultBlock || HOSTEL_BLOCKS[0]);
  const [method, setMethod] = useState<"online" | "cod">("online");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const r = it.restaurants?.name ?? "Other";
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const lines: CartLine[] = items
    .filter((i) => (qty[i.id] ?? 0) > 0)
    .map((i) => ({ item: i, quantity: qty[i.id] }));
  const totals = computeTotals(lines, { isCod: method === "cod" });

  function bump(id: string, delta: number) {
    setQty((q) => {
      const n = Math.max(0, (q[id] ?? 0) + delta);
      return { ...q, [id]: n };
    });
  }

  async function submit() {
    setError(null);
    if (lines.length === 0) return setError("Select at least one item");
    const rErr = validateRoom(room);
    if (rErr) return setError(rErr);
    if (method === "online" && !file) return setError("Upload your payment screenshot");
    setBusy(true);
    const supabase = createClient();
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      let screenshotUrl: string | null = null;
      if (method === "online" && file) {
        const path = `${uid}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("payment-screenshots")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;
        screenshotUrl = supabase.storage.from("payment-screenshots").getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await supabase.rpc("place_preorder", {
        p_room_number: room.trim(),
        p_block: block,
        p_payment_method: method,
        p_payment_screenshot_url: screenshotUrl,
        p_items: lines.map((l) => ({ item_id: l.item.id, quantity: l.quantity })),
      });
      if (error) throw error;
      const order = Array.isArray(data) ? data[0] : data;
      router.push(`/track/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <PageContainer max="max-w-3xl">
        <EmptyState
          icon={<CalendarClock className="h-14 w-14" />}
          title="Check back when pre orders are open"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-text">Pre-order for tonight</h1>
      <p className="mb-5 text-sm text-text-muted">
        Reserve items across restaurants. Pay now; the founder buys based on pre-orders.
      </p>

      {groups.map(([restaurant, list]) => (
        <div key={restaurant} className="mb-6">
          <p className="mb-2 flex items-center gap-2 font-bold text-text">
            <Store className="h-4 w-4 text-primary" /> {restaurant}
          </p>
          <div className="space-y-2">
            {list.map((it) => (
              <Card key={it.id}>
                <CardBody className="flex items-center gap-3 p-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-muted text-xl">
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🍽️"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{it.name}</p>
                    <p className="text-sm font-bold text-primary">{money(it.discounted_price ?? it.price)}</p>
                    {it.expected_arrival && (
                      <p className="text-xs text-text-faint">ETA {it.expected_arrival}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => bump(it.id, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-5 text-center font-semibold">{qty[it.id] ?? 0}</span>
                    <button onClick={() => bump(it.id, 1)} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Room number</Label>
              <Input inputMode="numeric" value={room} onChange={(e) => setRoom(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <Label>Block</Label>
              <Select value={block} onChange={(e) => setBlock(e.target.value)}>
                {HOSTEL_BLOCKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Payment</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["online", "cod"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium",
                    method === m ? "border-primary bg-primary-soft text-primary" : "border-border text-text-muted",
                  )}
                >
                  {m === "online" ? "Online" : `COD (+${money(COD_EXTRA_CHARGE)})`}
                </button>
              ))}
            </div>
          </div>
          {method === "online" && account && (
            <div className="rounded-xl bg-primary-soft/60 p-3 text-sm">
              <p className="font-semibold text-text">Pay to:</p>
              <p className="text-text-muted">{account}</p>
            </div>
          )}
          {method === "online" && (
            <label className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center text-sm text-text-faint">
                  <Upload className="mb-1 h-6 w-6 text-primary" /> Payment screenshot
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(f ? URL.createObjectURL(f) : null);
              }} />
            </label>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody className="space-y-1 text-sm">
          <Row label="Items" value={money(totals.itemTotal)} />
          <Row label="Delivery" value={money(totals.deliveryFee)} />
          <Row label="Platform fee" value={money(totals.platformFee)} />
          {method === "cod" && <Row label="COD" value={money(totals.codCharge)} />}
          <Row label="GST (5%)" value={money(totals.gst)} />
          <div className="my-1 border-t border-border" />
          <div className="flex justify-between text-base font-extrabold">
            <span>Total</span>
            <span className="text-success">{money(totals.grandTotal)}</span>
          </div>
        </CardBody>
      </Card>

      {error && <p className="mb-3 text-sm text-error">{error}</p>}
      <Button className="w-full" size="lg" variant="success" loading={busy} onClick={submit}>
        Place pre-order
      </Button>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
