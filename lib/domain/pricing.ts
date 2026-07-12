// Cart pricing ported 1:1 from cfd/lib/core/providers/cart_provider.dart
// (CartTotals.fromItems). Display-only — server re-prices in place_order.
import { COD_EXTRA_CHARGE, GST_PERCENT, PLATFORM_FEE } from "./constants";
import type { CartLine } from "@/lib/types/models";

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
  opts: { isCod: boolean; discountAmount?: number } = { isCod: false },
): CartTotals {
  const discountAmount = opts.discountAmount ?? 0;

  const itemTotal = lines.reduce(
    (sum, l) => sum + effectivePrice(l) * l.quantity,
    0,
  );
  const deliveryFee = lines.reduce(
    (sum, l) => sum + l.item.delivery_fee * l.quantity,
    0,
  );
  const platformFee = PLATFORM_FEE;
  const codCharge = opts.isCod ? COD_EXTRA_CHARGE : 0;

  const subtotalBeforeGst =
    itemTotal + deliveryFee + platformFee + codCharge - discountAmount;
  const gst = (subtotalBeforeGst * GST_PERCENT) / 100;
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
