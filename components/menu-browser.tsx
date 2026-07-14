"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Plus, Check } from "lucide-react";
import { CATEGORIES } from "@/lib/domain/constants";
import { money, cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { PageContainer } from "@/components/app-shell";
import type { Item } from "@/lib/types/models";

export function MenuBrowser({
  items,
  shiftActive,
  firstName,
  campusName,
}: {
  items: Item[];
  shiftActive: boolean;
  firstName: string;
  campusName: string;
}) {
  const [category, setCategory] = useState<string>("All");

  const visible = useMemo(
    () => (category === "All" ? items : items.filter((i) => i.category === category)),
    [items, category],
  );

  return (
    <PageContainer>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-text">
            Hey, {firstName}! 👋
          </h1>
          <p className="text-sm text-text-muted">{campusName}</p>
        </div>
      </div>

      {!shiftActive && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-error/40 bg-error/5 p-5">
          <Moon className="h-7 w-7 text-error" />
          <div>
            <p className="font-extrabold text-error">ALL FINISHED FOR TODAY</p>
            <p className="text-sm text-text-muted">
              Ordering is closed. Come back for the next shift!
            </p>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
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

      {visible.length === 0 ? (
        <p className="py-20 text-center text-text-faint">No items here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} enabled={shiftActive} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function ItemCard({ item, enabled }: { item: Item; enabled: boolean }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const soldOut = item.stock_quantity <= 0 || !item.is_available || !enabled;
  const fewLeft =
    !soldOut && (item.stock_quantity <= 5 || item.tag === "FEW LEFT");
  const discounted = item.discounted_price != null;

  function onAdd() {
    if (soldOut) return;
    add(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        soldOut && "opacity-60",
      )}
    >
      <div className="relative aspect-square bg-bg-muted">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className={cn(
              "h-full w-full object-cover",
              soldOut && "grayscale",
            )}
          />
        ) : (
          <div className="grid h-full place-items-center text-4xl">🍽️</div>
        )}
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-error">
              {enabled ? "SOLD OUT" : "CLOSED"}
            </span>
          </div>
        )}
        {fewLeft && (
          <span className="absolute top-2 left-2 rounded-full bg-accent-warm px-2 py-0.5 text-[11px] font-bold text-white">
            FEW LEFT
          </span>
        )}
        {discounted && !soldOut && (
          <span className="absolute top-2 right-2 rounded-full bg-accent-warm px-2 py-0.5 text-[11px] font-bold text-white">
            SALE
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-semibold text-text">{item.name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-bold text-primary">
            {money(discounted ? item.discounted_price : item.price)}
          </span>
          {discounted && (
            <span className="text-xs text-text-faint line-through">
              {money(item.price)}
            </span>
          )}
        </div>
        {item.expected_arrival && (
          <p className="mt-0.5 text-xs text-text-faint">🕒 ETA {item.expected_arrival}</p>
        )}
        <button
          disabled={soldOut}
          onClick={onAdd}
          className={cn(
            "mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
            soldOut
              ? "cursor-not-allowed bg-bg-muted text-text-faint"
              : added
                ? "bg-success text-white"
                : "bg-primary-soft text-primary hover:bg-primary hover:text-on-primary",
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" /> Added
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
