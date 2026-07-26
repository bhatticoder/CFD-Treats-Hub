import type { Campus } from "@/lib/types/models";

/** Effective "are pre-orders open" — mirrors the SQL preorder_is_open():
 *  manual master switch OR inside the scheduled [opens_at, closes_at] window. */
export function isPreorderOpen(campus: Campus | null | undefined): boolean {
  if (!campus) return false;
  if (campus.preorder_open) return true;
  if (!campus.preorder_opens_at) return false;
  const now = Date.now();
  const opens = new Date(campus.preorder_opens_at).getTime();
  if (now < opens) return false;
  if (campus.preorder_closes_at) {
    return now <= new Date(campus.preorder_closes_at).getTime();
  }
  return true;
}

/** Build a wa.me link from a stored number (strips non-digits). */
export function whatsappLink(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
