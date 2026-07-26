// Row shapes mirroring the Supabase schema (cfd/supabase/migrations/*.sql).
import type { OrderStatus, PaymentMethod, Role } from "@/lib/domain/constants";

export interface Campus {
  id: string;
  name: string;
  domain_suffix: string;
  gender: "Male" | "Female" | null;
  logo_url: string | null;
  theme_color: string | null;
  payment_account_info: string | null;
  cod_cap_percent: number;
  manager_discount_enabled: boolean;
  shift_active: boolean;
  is_active: boolean;
  preorder_open: boolean;
  preorder_opens_at: string | null;
  preorder_closes_at: string | null;
  whatsapp_number: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  room_number: string | null;
  block: string | null;
  campus_id: string | null;
  role: Role;
  gender: "Male" | "Female" | null;
  is_active: boolean;
  created_at: string;
  // joined
  campus_name?: string | null;
}

export interface Restaurant {
  id: string;
  campus_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  campus_id: string;
  name: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  delivery_fee: number;
  image_url: string | null;
  category: string;
  stock_quantity: number;
  is_available: boolean;
  custom_instruction: string | null;
  tag: string | null;
  restaurant_id: string | null;
  expected_arrival: string | null;
  is_preorder: boolean;
  created_at: string;
  // joined
  restaurants?: { name: string } | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  // joined live item (for custom instruction / image in manager view)
  items?: { name?: string; image_url?: string | null; custom_instruction?: string | null } | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  campus_id: string;
  room_number: string;
  block: string;
  payment_method: PaymentMethod;
  payment_screenshot_url: string | null;
  payment_status: string;
  order_status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  cod_fee: number;
  gst: number;
  discount_amount: number;
  total: number;
  promo_code: string | null;
  rating: number | null;
  is_preorder: boolean;
  created_at: string;
  delivered_at: string | null;
  order_items?: OrderItem[];
}

export interface AppNotification {
  id: string;
  campus_id: string;
  title: string;
  message: string;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  actor_role: Role | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  campus_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/** Client-side cart line (item + chosen quantity). */
export interface CartLine {
  item: Item;
  quantity: number;
}
