// Business constants ported 1:1 from cfd/lib/core/constants/app_constants.dart.
// NOTE: fee/GST/COD numbers here are for DISPLAY only. The `place_order` RPC
// re-computes every rupee server-side, so a forged client total is impossible.

export const DEFAULT_DOMAIN_SUFFIX = "@cfd.nu.edu.pk";

export const PLATFORM_FEE = 5.0;
export const GST_PERCENT = 5.0;
export const COD_EXTRA_CHARGE = 30.0;

export const GENDERS = ["Male", "Female"] as const;

export const CATEGORIES = [
  "All",
  "Burgers",
  "Pizza",
  "Snacks",
  "Drinks",
  "Desserts",
] as const;

export const ROLES = ["customer", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "placed",
  "preparing",
  "on_the_way",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["online", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const BUCKET_ITEM_IMAGES = "item-images";
export const BUCKET_PAYMENT_SCREENSHOTS = "payment-screenshots";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  preparing: "Preparing",
  on_the_way: "Treat on the way ✈",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
