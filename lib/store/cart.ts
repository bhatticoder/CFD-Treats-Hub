"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Item } from "@/lib/types/models";

interface CartState {
  lines: CartLine[];
  add: (item: Item) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  remove: (itemId: string) => void;
  clear: () => void;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (item) =>
        set((s) => {
          const existing = s.lines.find((l) => l.item.id === item.id);
          if (existing) {
            if (existing.quantity >= item.stock_quantity) return s;
            return {
              lines: s.lines.map((l) =>
                l.item.id === item.id
                  ? { ...l, quantity: l.quantity + 1 }
                  : l,
              ),
            };
          }
          if (item.stock_quantity < 1) return s;
          return { lines: [...s.lines, { item, quantity: 1 }] };
        }),
      increment: (itemId) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.item.id === itemId && l.quantity < l.item.stock_quantity
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
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
    }),
    { name: "cfd-cart" },
  ),
);
