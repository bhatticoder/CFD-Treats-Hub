"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, Upload, PartyPopper } from "lucide-react";
import { useCart, CART_TTL } from "@/lib/store/cart";
import { computeTotals, effectivePrice } from "@/lib/domain/pricing";
import { COD_EXTRA_CHARGE, PLATFORM_FEE } from "@/lib/domain/constants";
import { validateRoom } from "@/lib/domain/validators";
import { money, cn } from "@/lib/utils";
import type { Voucher, Campus } from "@/lib/types/models";
import { PageContainer } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ShoppingCart } from "lucide-react";
import Image from "next/image";
import { firebaseStorage } from "@/lib/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CartPage() {
  const router = useRouter();
  const { lines, increment, decrement, remove, clear, refreshItems, lastRefreshed } = useCart();
  const [room, setRoom] = useState("");
  const [block, setBlock] = useState<string>("");
  const [method, setMethod] = useState<"online" | "cod">("online");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");
  const [activeVouchers, setActiveVouchers] = useState<Voucher[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [campusClosed, setCampusClosed] = useState(false);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [campusName, setCampusName] = useState<string | null>(null);
  const [isGirlsCampus, setIsGirlsCampus] = useState(false);
  const [deliveryActive, setDeliveryActive] = useState(true);
  const [collectionRoom, setCollectionRoom] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cartLines = useCart.getState().lines;
      const needsRefresh = cartLines.length > 0 && (Date.now() - lastRefreshed > CART_TTL);
      const itemIds = needsRefresh ? cartLines.map((l) => l.item.id) : [];

      try {
        const res = await fetch("/api/cart/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds })
        });
        
        if (!res.ok) return;
        const data = await res.json();
        
        const prof = data.profile;
        if (prof?.room_number) setRoom(prof.room_number);
        if (prof?.block) setBlock(prof.block);

        let userCampus = prof?.campuses as Campus | null;

        if (userCampus) setCampus(userCampus);
        if (userCampus?.name) setCampusName(userCampus.name);
        if (userCampus?.payment_account_info) setAccount(userCampus.payment_account_info);
        if (userCampus && userCampus.shift_active === false) {
          setCampusClosed(true);
        }
        if (userCampus?.gender === "Female") {
          setIsGirlsCampus(true);
        }
        if (userCampus?.delivery_active !== undefined) {
          setDeliveryActive(userCampus.delivery_active);
        }
        if (userCampus?.collection_room !== undefined) {
          setCollectionRoom(userCampus.collection_room);
        }

        if (data.vouchers) setActiveVouchers(data.vouchers);
        
        if (data.freshItems && data.freshItems.length > 0) {
          refreshItems(data.freshItems);
        }
      } catch (err) {
        console.error("Error fetching cart data:", err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPreorder = lines.some(l => l.item.is_preorder);
  let discountAmount = 0;
  if (appliedVoucher) {
    const deliveryFee = lines.reduce((sum, l) => sum + (l.item.delivery_fee || 0) * l.quantity, 0);
    const platformFee = isPreorder
      ? (campus?.preorder_platform_fee ?? PLATFORM_FEE)
      : (campus?.regular_platform_fee ?? PLATFORM_FEE);
    const codCharge = method === "cod"
      ? isPreorder
        ? (campus?.preorder_cod_charge ?? COD_EXTRA_CHARGE)
        : (campus?.regular_cod_charge ?? COD_EXTRA_CHARGE)
      : 0;

    const sub = lines.reduce((sum, l) => sum + effectivePrice(l) * l.quantity, 0) + 
                deliveryFee + platformFee + codCharge;
    
    if (sub >= appliedVoucher.min_order_value) {
      discountAmount = appliedVoucher.discount_type === "percentage" 
        ? sub * (appliedVoucher.discount_value / 100)
        : appliedVoucher.discount_value;
      if (discountAmount > sub) discountAmount = sub;
    }
  }

  const totals = computeTotals(lines, { isCod: method === "cod", discountAmount, campus });

  function applyPromo() {
    setVoucherError(null);
    if (!promoCode.trim()) {
      setAppliedVoucher(null);
      return;
    }
    const v = activeVouchers.find(v => v.code.toUpperCase() === promoCode.trim().toUpperCase());
    if (!v) {
      setVoucherError("Invalid or expired promo code");
      setAppliedVoucher(null);
      return;
    }
    const deliveryFee = lines.reduce((sum, l) => sum + (l.item.delivery_fee || 0) * l.quantity, 0);
    const platformFee = isPreorder
      ? (campus?.preorder_platform_fee ?? PLATFORM_FEE)
      : (campus?.regular_platform_fee ?? PLATFORM_FEE);
    const codCharge = method === "cod"
      ? isPreorder
        ? (campus?.preorder_cod_charge ?? COD_EXTRA_CHARGE)
        : (campus?.regular_cod_charge ?? COD_EXTRA_CHARGE)
      : 0;

    const sub = lines.reduce((sum, l) => sum + effectivePrice(l) * l.quantity, 0) + 
                deliveryFee + platformFee + codCharge;
    if (sub < v.min_order_value) {
      setVoucherError(`Minimum order value for this code is ${money(v.min_order_value)}`);
      setAppliedVoucher(null);
      return;
    }
    setAppliedVoucher(v);
  }

  async function placeOrder() {
    setError(null);
    if (deliveryActive) {
      const rErr = validateRoom(room);
      if (rErr) return setError(rErr);
    }
    if (method === "online" && !file) {
      return setError("Please upload your payment screenshot");
    }
    setPlacing(true);
    
    try {
      let screenshotUrl: string | null = null;
      if (method === "online" && file) {
        const ownerUid = (await import("@/lib/firebase/config")).firebaseAuth.currentUser?.uid ?? "anon";
        const path = `payment-screenshots/${ownerUid}-${crypto.randomUUID()}-${file.name}`;
        const storageRef = ref(firebaseStorage, path);
        await uploadBytes(storageRef, file);
        screenshotUrl = await getDownloadURL(storageRef);
      }

      let finalBlock = block;
      if (campus?.halls && campus.halls.length === 1) {
        finalBlock = campus.halls[0];
      } else if (!finalBlock) {
        finalBlock = "Main"; 
      }

      const res = await fetch("/api/order/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_room_number: deliveryActive ? room.trim() : `Pickup: ${collectionRoom || "Counter"}`,
          p_block: finalBlock,
          p_payment_method: method,
          p_payment_screenshot_url: screenshotUrl,
          p_items: lines.map((l) => ({
            item_id: l.item.id,
            quantity: l.quantity,
          })),
          p_promo_code: appliedVoucher ? appliedVoucher.code : null,
          p_additional_note: additionalNote.trim() ? additionalNote.trim() : null,
          isPreorder
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      const order = data.order;
      
      try {
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campusId: lines[0]?.item.campus_id,
            role: "manager",
            title: "New Order Placed 🚀",
            message: `Order #${order.order_number} has been placed.`,
            url: "/admin/orders"
          })
        }).catch(() => {});
      } catch (e) {}

      clear();
      router.push(`/track/${order.id}`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
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
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-bg-muted text-2xl flex items-center justify-center">
              {l.item.image_url ? (
                <Image src={l.item.image_url} alt="" fill className="object-cover" />
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
          <div className={`grid ${isGirlsCampus || !deliveryActive ? "grid-cols-1" : "grid-cols-3"} gap-3`}>
            {deliveryActive ? (
              <>
                <div className={isGirlsCampus ? "" : "col-span-2"}>
                  <Label>Room number</Label>
                  <Input
                    inputMode="numeric"
                    value={room}
                    onChange={(e) => setRoom(e.target.value.replace(/\D/g, ""))}
                    placeholder="Digits only"
                  />
                </div>
                {(!campus?.halls || campus.halls.length > 1) && (
                  <div>
                    <Label>Block / Hall</Label>
                    <Select value={block} onChange={(e) => setBlock(e.target.value)}>
                      <option value="">Select...</option>
                      {campus?.halls?.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-accent-warm/30 bg-accent-warm/10 p-4 text-center">
                <p className="font-extrabold text-accent-warm text-lg">Self-Pickup Only</p>
                <p className="text-sm mt-1 text-text">Please collect your order from <span className="font-black px-1.5 py-0.5 bg-accent-warm/20 text-accent-warm rounded-md">{collectionRoom || "the kitchen"}</span></p>
              </div>
            )}
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
                  {m === "online" ? "Online payment" : `COD (+${money(
                    isPreorder 
                      ? (campus?.preorder_cod_charge ?? COD_EXTRA_CHARGE) 
                      : (campus?.regular_cod_charge ?? COD_EXTRA_CHARGE)
                  )})`}
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
              <label className="relative flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-bg-muted">
                {preview ? (
                  <Image src={preview} alt="" fill className="object-cover" />
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

      {/* Additional Note & Promo Code */}
      <div className="mt-5 space-y-4">
        <Card>
          <CardBody>
            <Label>Additional Note (Optional)</Label>
            <Input
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="How can we please you more?"
            />
          </CardBody>
        </Card>

        {activeVouchers.length > 0 && (
          <Card>
            <CardBody>
              <Label>Promo Code</Label>

              <div className="flex gap-2 mt-1">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter discount code"
                  className="uppercase"
                />
                <Button onClick={applyPromo} variant="outline">Apply</Button>
              </div>
              {voucherError && <p className="mt-1 text-xs text-error">{voucherError}</p>}
              {appliedVoucher && (
                <p className="mt-1 text-xs text-success">
                  Promo code applied! You get {appliedVoucher.discount_type === "percentage" ? `${appliedVoucher.discount_value}% OFF` : `${money(appliedVoucher.discount_value)} OFF`}.
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Bill */}
      <Card className="mt-4">
        <CardBody className="space-y-2 text-sm">
          <Row label="Item total" value={money(totals.itemTotal)} />
          {totals.deliveryFee > 0 && <Row label="Delivery fee" value={money(totals.deliveryFee)} />}
          <Row label="Platform fee" value={money(totals.platformFee)} />
          {method === "cod" && <Row label="COD charges" value={money(totals.codCharge)} />}
          {totals.discountAmount > 0 && (
            <div className="flex items-center justify-between text-success">
              <span>Discount</span>
              <span>-{money(totals.discountAmount)}</span>
            </div>
          )}
          <Row label={`GST (${isPreorder ? (campus?.preorder_gst ?? 5) : (campus?.regular_gst ?? 5)}%)`} value={money(totals.gst)} />
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

      {campusClosed && (
        <div className="mt-4 rounded-2xl border border-error/40 bg-error/10 p-4 text-center">
          <p className="font-bold text-error">
            ALL FINISHED FOR TODAY — {campusName ?? "Campus"} Shift is Closed
          </p>
          <p className="mt-1 text-xs text-text-muted">
            The admin or manager has closed live orders for today. Turn ON “Live Shift” in Admin Panel → Campuses to accept orders!
          </p>
        </div>
      )}

      {error && !campusClosed && (
        <div className="mt-4 rounded-xl border border-error/40 bg-error/10 p-4 text-center text-sm font-semibold text-error">
          {error.includes("ALL FINISHED")
            ? `ALL FINISHED FOR TODAY — Live shift is closed for ${campusName ?? "your campus"}. Turn ON Live Shift in Admin Panel → Campuses.`
            : error}
        </div>
      )}

      <Button
        className="mt-5 w-full"
        size="lg"
        variant="success"
        loading={placing}
        disabled={campusClosed || !deliveryActive}
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
