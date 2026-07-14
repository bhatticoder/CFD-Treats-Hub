"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, Upload, PartyPopper } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/store/cart";
import { computeTotals, effectivePrice } from "@/lib/domain/pricing";
import { HOSTEL_BLOCKS, COD_EXTRA_CHARGE } from "@/lib/domain/constants";
import { validateRoom } from "@/lib/domain/validators";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ShoppingCart } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { lines, increment, decrement, remove, clear } = useCart();
  const [room, setRoom] = useState("");
  const [block, setBlock] = useState<string>(HOSTEL_BLOCKS[0]);
  const [method, setMethod] = useState<"online" | "cod">("online");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("room_number, block, campuses(payment_account_info)")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data?.room_number) setRoom(data.room_number);
      if (data?.block) setBlock(data.block);
      const campus = data?.campuses as { payment_account_info?: string } | null;
      if (campus?.payment_account_info) setAccount(campus.payment_account_info);
    })();
  }, []);

  const totals = computeTotals(lines, { isCod: method === "cod" });

  async function placeOrder() {
    setError(null);
    const rErr = validateRoom(room);
    if (rErr) return setError(rErr);
    if (method === "online" && !file) {
      return setError("Please upload your payment screenshot");
    }
    setPlacing(true);
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
        screenshotUrl = supabase.storage
          .from("payment-screenshots")
          .getPublicUrl(path).data.publicUrl;
      }

      // Server prices the order from item_id + quantity only.
      const { data, error } = await supabase.rpc("place_order", {
        p_room_number: room.trim(),
        p_block: block,
        p_payment_method: method,
        p_payment_screenshot_url: screenshotUrl,
        p_items: lines.map((l) => ({
          item_id: l.item.id,
          quantity: l.quantity,
        })),
      });
      if (error) throw error;
      const order = Array.isArray(data) ? data[0] : data;
      clear();
      router.push(`/track/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <PageContainer max="max-w-3xl">
        <EmptyState
          icon={<ShoppingCart className="h-14 w-14" />}
          title="Your cart is empty"
          hint="Add some treats from the menu!"
        />
        <div className="text-center">
          <Button onClick={() => router.push("/")}>Browse menu</Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="mb-4 text-2xl font-extrabold text-text">Your Cart</h1>

      <div className="space-y-3">
        {lines.map((l) => (
          <motion.div
            key={l.item.id}
            layout
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-muted text-2xl">
              {l.item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.item.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                "🍽️"
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{l.item.name}</p>
              <p className="text-sm font-bold text-primary">
                {money(effectivePrice(l))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => decrement(l.item.id)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-5 text-center font-semibold">{l.quantity}</span>
              <button
                onClick={() => increment(l.item.id)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => remove(l.item.id)} className="ml-1 text-text-faint">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delivery */}
      <Card className="mt-5">
        <CardBody className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Room number</Label>
              <Input
                inputMode="numeric"
                value={room}
                onChange={(e) => setRoom(e.target.value.replace(/\D/g, ""))}
                placeholder="Digits only"
              />
            </div>
            <div>
              <Label>Block</Label>
              <Select value={block} onChange={(e) => setBlock(e.target.value)}>
                {HOSTEL_BLOCKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label>Payment method</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["online", "cod"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-medium",
                    method === m
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-text-muted",
                  )}
                >
                  {m === "online" ? "Online payment" : `COD (+${money(COD_EXTRA_CHARGE)})`}
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
            <div>
              <Label>Payment screenshot</Label>
              <label className="flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-bg-muted">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center text-sm text-text-faint">
                    <Upload className="mb-1 h-6 w-6 text-primary" />
                    Upload payment screenshot
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    setPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
              </label>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Bill */}
      <Card className="mt-4">
        <CardBody className="space-y-2 text-sm">
          <Row label="Item total" value={money(totals.itemTotal)} />
          <Row label="Delivery fee" value={money(totals.deliveryFee)} />
          <Row label="Platform fee" value={money(totals.platformFee)} />
          {method === "cod" && <Row label="COD charges" value={money(totals.codCharge)} />}
          <Row label="GST (5%)" value={money(totals.gst)} />
          <div className="my-2 border-t border-border" />
          <div className="flex items-center justify-between text-base font-extrabold">
            <span>Grand total</span>
            <span className="text-success">{money(totals.grandTotal)}</span>
          </div>
          <p className="text-xs text-text-faint">
            Final amount is confirmed by the server when you place the order.
          </p>
        </CardBody>
      </Card>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      <Button
        className="mt-5 w-full"
        size="lg"
        variant="success"
        loading={placing}
        onClick={placeOrder}
      >
        <PartyPopper className="h-5 w-5" /> Place order
      </Button>
    </PageContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
