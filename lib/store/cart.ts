"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Item } from "@/lib/types/models";

/** Cart data older than this (ms) will be refreshed on the cart page. */
export const CART_TTL = 30 * 60 * 1000; // 30 minutes

interface CartState {
  lines: CartLine[];
  lastRefreshed: number;
  add: (item: Item) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  count: () => number;
  /** Bug #12 fix: update cart lines with fresh item data from the DB. */
  refreshItems: (freshItems: Item[]) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      lastRefreshed: 0,
      add: (item) =>
        set((s) => {
          let currentLines = s.lines;
          // Prevent mixing regular and preorder items.
          if (currentLines.length > 0 && currentLines[0].item.is_preorder !== item.is_preorder) {
            currentLines = [];
          }

          const existing = currentLines.find((l) => l.item.id === item.id);
          if (existing) {
            if (!item.is_preorder && existing.quantity >= item.stock_quantity) return { lines: currentLines };
            return {
              lines: currentLines.map((l) =>
                l.item.id === item.id
                  ? { ...l, quantity: l.quantity + 1 }
                  : l,
              ),
            };
          }
          if (!item.is_preorder && item.stock_quantity < 1) return { lines: currentLines };
          return { lines: [...currentLines, { item, quantity: 1 }] };
        }),
      increment: (itemId) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.item.id === itemId && (l.item.is_preorder || l.quantity < l.item.stock_quantity)
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          ),
        })),
      decrement: (itemId) =>
        set((s) => ({
          lines: s.lines
            .map((l) =>
              l.item.id === itemId ? { ...l, quantity: l.quantity - 1 } : l,
            )
            .filter((l) => l.quantity > 0),
        })),
      remove: (itemId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.item.id !== itemId) })),
      clear: () => set({ lines: [], lastRefreshed: 0 }),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
      refreshItems: (freshItems) =>
        set((s) => {
          const freshMap = new Map(freshItems.map((i) => [i.id, i]));
          const updatedLines = s.lines
            .map((l) => {
              const fresh = freshMap.get(l.item.id);
              if (!fresh) return null; // item no longer exists — remove from cart
              if (!fresh.is_available) return null; // item unavailable — remove
              return {
                item: fresh,
                quantity: fresh.is_preorder ? l.quantity : Math.min(l.quantity, fresh.stock_quantity || l.quantity),
              };
            })
            .filter((l): l is CartLine => l !== null && l.quantity > 0);
          return { lines: updatedLines, lastRefreshed: Date.now() };
        }),
    }),
    { name: "cfd-cart" },
  ),
);

