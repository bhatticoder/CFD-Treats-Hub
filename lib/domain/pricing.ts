// Cart pricing ported 1:1 from cfd/lib/core/providers/cart_provider.dart
// (CartTotals.fromItems). Display-only — server re-prices in place_order.
import { COD_EXTRA_CHARGE, GST_PERCENT, PLATFORM_FEE } from "./constants";
import type { CartLine, Campus } from "@/lib/types/models";

export interface CartTotals {
  itemCount: number;
  itemTotal: number;
  deliveryFee: number;
  platformFee: number;
  codCharge: number;
  discountAmount: number;
  gst: number;
  grandTotal: number;
}

export function computeTotals(
  lines: CartLine[],
  opts: { isCod: boolean; discountAmount?: number; campus?: Campus | null } = { isCod: false },
): CartTotals {
  const discountAmount = opts.discountAmount ?? 0;
  const campus = opts.campus;

  const itemTotal = lines.reduce(
    (sum, l) => sum + effectivePrice(l) * l.quantity,
    0,
  );
  const isPreorder = lines.some(l => l.item.is_preorder);

  const deliveryFee = lines.reduce(
    (sum, l) => sum + (l.item.delivery_fee || 0) * l.quantity,
    0,
  );

  const platformFee = isPreorder
    ? (campus?.preorder_platform_fee ?? PLATFORM_FEE)
    : (campus?.regular_platform_fee ?? PLATFORM_FEE);

  const codCharge = opts.isCod
    ? isPreorder
      ? (campus?.preorder_cod_charge ?? COD_EXTRA_CHARGE)
      : (campus?.regular_cod_charge ?? COD_EXTRA_CHARGE)
    : 0;

  const subtotalBeforeGst =
    itemTotal + deliveryFee + platformFee + codCharge - discountAmount;
  
  const gstPercent = isPreorder
    ? (campus?.preorder_gst ?? GST_PERCENT)
    : (campus?.regular_gst ?? GST_PERCENT);

  const gst = (subtotalBeforeGst * gstPercent) / 100;
  const grandTotal = subtotalBeforeGst + gst;

  return {
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    itemTotal,
    deliveryFee,
    platformFee,
    codCharge,
    discountAmount,
    gst,
    grandTotal,
  };
}

/** Discounted price when present, else the base price. */
export function effectivePrice(line: CartLine): number {
  return line.item.discounted_price ?? line.item.price;
}
