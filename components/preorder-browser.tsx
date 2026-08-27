"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Store, CalendarClock } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import type { Item } from "@/lib/types/models";
import { useCart } from "@/lib/store/cart";
import Image from "next/image";

export function PreorderBrowser({
  items,
  categories = [],
}: {
  items: Item[];
  categories?: string[];
  defaultRoom: string;
  defaultBlock: string;
  account: string | null;
  isGirlsCampus: boolean;
  deliveryActive: boolean;
  collectionRoom: string | null;
  halls: string[];
}) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("All");

  const { lines, add, increment, decrement } = useCart();

  // Distinct restaurants present in this campus's items.
  const restaurants = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.restaurants?.name) set.add(i.restaurants.name);
    });
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  // Distinct categories present in this campus's items that are also defined by admin
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) {
        i.category.split(',').forEach(c => {
          const trimmed = c.trim();
          if (categories.length === 0 || categories.includes(trimmed)) {
            set.add(trimmed);
          }
        });
      }
    });
    return ["All", ...Array.from(set).sort()];
  }, [items, categories]);

  // Filter items based on selected category and restaurant
  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (category === "All" || (i.category && i.category.split(',').map(c => c.trim()).includes(category))) &&
          (restaurantFilter === "All" || i.restaurants?.name === restaurantFilter),
      ),
    [items, category, restaurantFilter],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of visible) {
      const r = it.restaurants?.name ?? "Other";
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  // Remove inline checkout form handlers

  if (items.length === 0) {
    return (
      <PageContainer max="max-w-3xl">
        <EmptyState
          icon={<CalendarClock className="h-14 w-14" />}
          title="Pre-orders are OPEN!"
          hint="No items available right now. Please check back shortly."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer max="max-w-3xl">
      <h1 className="text-2xl font-extrabold text-text">Pre-order for tonight</h1>
      <p className="mb-5 text-sm text-text-muted">
        Reserve items across restaurants and receive tonight 🙌🏻
      </p>

      {/* Category tabs */}
      <div className="mb-3 flex flex-wrap gap-2">
        {dynamicCategories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              category === c
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface text-text-muted hover:bg-bg-muted",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Restaurant tabs */}
      {restaurants.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {restaurants.map((r) => (
            <button
              key={r}
              onClick={() => setRestaurantFilter(r)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
                restaurantFilter === r
                  ? "border-accent-warm bg-accent-warm text-white"
                  : "border-border bg-surface text-text-muted hover:bg-bg-muted",
              )}
            >
              {r !== "All" && <Store className="h-3.5 w-3.5" />}
              {r}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="py-10 text-center text-text-faint">No items found.</p>
      ) : (
        groups.map(([restaurant, list]) => (
        <div key={restaurant} className="mb-6">
          <p className="mb-2 flex items-center gap-2 font-bold text-text">
            <Store className="h-4 w-4 text-primary" /> {restaurant}
          </p>
          <div className="space-y-2">
            {list.map((it) => {
              const qty = lines.find((l) => l.item.id === it.id)?.quantity ?? 0;
              return (
                <Card key={it.id}>
                  <CardBody className="flex items-center gap-3 p-3">
                    <div 
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-bg-muted text-xl cursor-pointer flex items-center justify-center"
                      onClick={() => setSelectedItem(it)}
                    >
                      {it.image_url ? (
                        <Image src={it.image_url} alt="" fill className="object-cover" />
                      ) : (
                        "🍽️"
                      )}
                    </div>
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedItem(it)}>
                      <p className="truncate font-semibold text-text">{it.name}</p>
                      <p className="text-sm font-bold text-primary">{money(it.discounted_price ?? it.price)}</p>
                      <p className="text-[11px] leading-tight text-text-faint/90 mt-1 pr-2">
                        Your Treats will be delivered on the time mentioned in official group, usually around 8-8:30 pm.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => qty > 0 ? decrement(it.id) : null} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary hover:bg-bg-muted transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-5 text-center font-semibold">{qty}</span>
                      <button onClick={() => add(it)} className="grid h-8 w-8 place-items-center rounded-full border border-border text-primary hover:bg-bg-muted transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )))}



      <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name || "Item Details"}>
        {selectedItem && (
          <div className="space-y-4">
            {selectedItem.image_url && (
              <div className="relative overflow-hidden rounded-xl border border-border h-48 w-full">
                <Image src={selectedItem.image_url} alt={selectedItem.name} fill className="object-cover" />
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-primary">{money(selectedItem.discounted_price ?? selectedItem.price)}</p>
              {selectedItem.description ? (
                <p className="mt-2 text-sm text-text-muted whitespace-pre-wrap">{selectedItem.description}</p>
              ) : (
                <p className="mt-2 text-sm italic text-text-faint">No description provided.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}

