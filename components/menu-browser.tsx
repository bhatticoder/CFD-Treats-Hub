"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Plus, Minus, Check, CalendarClock, Store, X, ShoppingCart, ArrowRight, Sparkles } from "lucide-react";
import { money, cn } from "@/lib/utils";
import { useCart } from "@/lib/store/cart";
import { PageContainer } from "@/components/app-shell";
import type { Item } from "@/lib/types/models";
import Image from "next/image";

export function MenuBrowser({
  items,
  categories = [],
  shiftActive,
  preordersOpen,
  firstName,
  campusName,
  deliveryActive = true,
  collectionRoom = null,
}: {
  items: Item[];
  categories?: string[];
  shiftActive: boolean;
  preordersOpen: boolean;
  firstName: string;
  campusName: string;
  deliveryActive?: boolean;
  collectionRoom?: string | null;
}) {
  const [category, setCategory] = useState<string>("All");
  const [restaurant, setRestaurant] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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

  // Category and restaurant filters combine (both can be active at once).
  const visible = useMemo(
    () =>
      items.filter(
        (i) =>
          (category === "All" || (i.category && i.category.split(',').map(c => c.trim()).includes(category))) &&
          (restaurant === "All" || i.restaurants?.name === restaurant),
      ),
    [items, category, restaurant],
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

      {!deliveryActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border-2 border-accent-warm/40 bg-accent-warm/10 p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-warm text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-accent-warm">Self-Pickup Only Today</h3>
            <p className="text-sm font-medium text-text mt-0.5">
              Room delivery is currently off. You'll need to walk a bit and collect your order from <span className="font-black text-primary px-1 bg-primary/10 rounded">{collectionRoom || "the kitchen"}</span>.
            </p>
          </div>
        </motion.div>
      )}

      {preordersOpen && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-r from-primary via-accent-warm to-primary p-0.5 shadow-lg shadow-primary/20"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[14px] bg-surface p-4 sm:p-5">
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <CalendarClock className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
                    Pre-orders Open
                  </span>
                  <Sparkles className="h-4 w-4 text-accent-warm animate-pulse" />
                </div>
                <h3 className="mt-0.5 text-lg font-black text-text leading-tight">
                  Order Now for Tonight! 🍕🍔
                </h3>
                <p className="text-xs text-text-muted">
                  Reserve your favorite treats early before slots fill up.
                </p>
              </div>
            </div>

            <Link
              href="/preorder"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-on-primary shadow-md transition-all hover:bg-primary-hover hover:scale-105 active:scale-95 shrink-0"
            >
              <span>Go to Pre-orders</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {!shiftActive && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-error/40 bg-error/5 p-5">
          <Moon className="h-7 w-7 text-error" />
          <div>
            <p className="font-extrabold text-error">ALL FINISHED FOR TODAY</p>
            <p className="text-sm text-text-muted">
              We&apos;ll treat you again tomorrow InShaAllah!
            </p>
          </div>
        </div>
      )}

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

      {/* Restaurant tabs (combine with categories) */}
      {restaurants.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {restaurants.map((r) => (
            <button
              key={r}
              onClick={() => setRestaurant(r)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors",
                restaurant === r
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

      {visible.length === 0 ? (
        <p className="py-20 text-center text-text-faint">No items here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              enabled={shiftActive}
              onOpenDetail={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            enabled={shiftActive}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  enabled,
  onOpenDetail,
}: {
  item: Item;
  enabled: boolean;
  onOpenDetail: () => void;
}) {
  const add = useCart((s) => s.add);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const lines = useCart((s) => s.lines);
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = item.stock_quantity <= 0 || !item.is_available || !enabled;
  const fewLeft =
    !soldOut && (item.stock_quantity <= 5 || item.tag === "FEW LEFT");
  const discounted = item.discounted_price != null;

  // Check if this item is already in the cart
  const cartLine = lines.find((l) => l.item.id === item.id);
  const inCart = !!cartLine;
  const qty = cartLine?.quantity ?? 0;

  function onAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (soldOut) return;
    add(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  }

  function onIncrement(e: React.MouseEvent) {
    e.stopPropagation();
    increment(item.id);
  }

  function onDecrement(e: React.MouseEvent) {
    e.stopPropagation();
    decrement(item.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm cursor-pointer",
        soldOut && "opacity-60",
      )}
      onClick={onOpenDetail}
    >
      <div className="relative aspect-square bg-bg-muted">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className={cn(
              "object-cover",
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
        {item.is_preorder && (
          <p className="mt-1 text-[10px] leading-tight text-text-faint/90">
            Delivery time mentioned in official group (usually 8-8:30 pm)
          </p>
        )}

        {/* Button area */}
        {inCart ? (
          // Permanent +/- controls when item is in cart
          <div
            className="mt-3 flex h-9 items-center justify-between rounded-lg bg-primary-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDecrement}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[1.5rem] text-center text-sm font-bold text-primary">
              {qty}
            </span>
            <button
              onClick={onIncrement}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          // Add button (with green flash on first add)
          <button
            disabled={soldOut}
            onClick={onAdd}
            className={cn(
              "mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors",
              soldOut
                ? "cursor-not-allowed bg-bg-muted text-text-faint"
                : justAdded
                  ? "bg-success text-white"
                  : "bg-primary-soft text-primary hover:bg-primary hover:text-on-primary",
            )}
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemDetailModal({
  item,
  enabled,
  onClose,
}: {
  item: Item;
  enabled: boolean;
  onClose: () => void;
}) {
  const add = useCart((s) => s.add);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const lines = useCart((s) => s.lines);
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);

  const soldOut = item.stock_quantity <= 0 || !item.is_available || !enabled;
  const discounted = item.discounted_price != null;

  const cartLine = lines.find((l) => l.item.id === item.id);
  const inCart = !!cartLine;
  const qty = cartLine?.quantity ?? 0;

  function onAdd() {
    if (soldOut) return;
    add(item);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        <div className="relative aspect-[4/3] w-full bg-bg-muted">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className={cn("object-cover", soldOut && "grayscale")}
            />
          ) : (
            <div className="grid h-full place-items-center text-7xl">🍽️</div>
          )}
          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[2px]">
              <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-error">
                {enabled ? "SOLD OUT" : "CLOSED"}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5">
          <h2 className="text-xl font-extrabold text-text">{item.name}</h2>

          {item.description && (
            <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary">
              {money(discounted ? item.discounted_price : item.price)}
            </span>
            {discounted && (
              <span className="text-sm text-text-faint line-through">
                {money(item.price)}
              </span>
            )}
          </div>

          {item.is_preorder && (
            <p className="mt-1.5 text-xs leading-tight text-text-faint/90">
              Your Treats will be delivered on the time mentioned in official group, usually around 8-8:30 pm.
            </p>
          )}

          {/* Add / Qty controls */}
          <div className="mt-5">
            {inCart ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-1 items-center justify-between rounded-xl bg-primary-soft h-12 px-2">
                  <button
                    onClick={() => decrement(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-lg font-bold text-primary">{qty}</span>
                  <button
                    onClick={() => increment(item.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => { onClose(); router.push("/cart"); }}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 h-12 font-semibold text-on-primary hover:bg-primary-hover transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Cart
                </button>
              </div>
            ) : (
              <button
                disabled={soldOut}
                onClick={onAdd}
                className={cn(
                  "w-full flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors",
                  soldOut
                    ? "cursor-not-allowed bg-bg-muted text-text-faint"
                    : justAdded
                      ? "bg-success text-white"
                      : "bg-primary text-on-primary hover:bg-primary-hover",
                )}
              >
                {justAdded ? (
                  <><Check className="h-5 w-5" /> Added to Cart!</>
                ) : (
                  <><Plus className="h-5 w-5" /> Add to Cart</>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
