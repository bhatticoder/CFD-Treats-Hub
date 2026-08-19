"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Pencil, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { CATEGORIES } from "@/lib/domain/constants";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch, Badge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import type { Item, Restaurant } from "@/lib/types/models";

type Draft = {
  name: string;
  description: string;
  price: string;
  stock_quantity: string;
  delivery_fee: string;
  category: string;
  custom_instruction: string;
  is_available: boolean;
  restaurant_id: string;
  campus_ids: string[];
  expected_arrival: string;
  is_preorder: boolean;
};

const empty: Draft = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  delivery_fee: "",
  category: "Snacks",
  custom_instruction: "",
  is_available: true,
  restaurant_id: "",
  campus_ids: [],
  expected_arrival: "",
  is_preorder: false,
};

export function InventoryManager({
  items,
  restaurants,
  campuses,
}: {
  items: Item[];
  restaurants: Restaurant[];
  campuses: import("@/lib/types/models").Campus[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "menu" | "preorder">("all");
  const [filterCampus, setFilterCampus] = useState<string>("all");
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function openNew() {
    setEditing(null);
    setDraft(empty);
    setFile(null);
    setPreview(null);
    setError(null);
    setOpen(true);
  }
  function openEdit(item: Item) {
    setEditing(item);
    setDraft({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      stock_quantity: String(item.stock_quantity),
      delivery_fee: String(item.delivery_fee),
      category: item.category,
      custom_instruction: item.custom_instruction ?? "",
      is_available: item.is_available,
      restaurant_id: item.restaurant_id ?? "",
      campus_ids: item.campus_id ? [item.campus_id] : [],
      expected_arrival: item.expected_arrival ?? "",
      is_preorder: item.is_preorder,
    });
    setFile(null);
    setPreview(item.image_url ?? null);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!draft.name.trim()) return setError("Name is required");
    if (draft.campus_ids.length === 0) return setError("At least one campus is required");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      let imageUrl = editing?.image_url ?? null;
      if (file) {
        const path = `items/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("item-images")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
      }
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price: Number(draft.price) || 0,
        stock_quantity: Number(draft.stock_quantity) || 0,
        delivery_fee: Number(draft.delivery_fee) || 0,
        category: draft.category,
        custom_instruction: draft.custom_instruction.trim() || null,
        is_available: draft.is_available,
        image_url: imageUrl,
        restaurant_id: draft.restaurant_id || null,
        expected_arrival: draft.expected_arrival.trim() || null,
        is_preorder: draft.is_preorder,
      };

      if (editing) {
        // Update the current item's original campus
        const originalCampus = editing.campus_id;
        const { error: upErr } = await supabase.from("items").update({ ...payload, campus_id: originalCampus }).eq("id", editing.id);
        if (upErr) throw upErr;
        
        // If they selected additional campuses during edit, duplicate the item for them!
        const newCampuses = draft.campus_ids.filter(id => id !== originalCampus);
        if (newCampuses.length > 0) {
          const inserts = newCampuses.map(id => ({ ...payload, campus_id: id }));
          const { error: insErr } = await supabase.from("items").insert(inserts);
          if (insErr) throw insErr;
        }
      } else {
        // Bulk insert for all selected campuses
        const inserts = draft.campus_ids.map(id => ({ ...payload, campus_id: id }));
        const { error: insErr } = await supabase.from("items").insert(inserts);
        if (insErr) throw insErr;
      }

      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: Item) {
    await createClient().from("items").update({ is_available: !item.is_available }).eq("id", item.id);
    router.refresh();
  }
  function confirmDelete(item: Item) {
    setDeleteError(null);
    setDeleting(item);
  }

  async function executeDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    const { error: delErr } = await createClient().from("items").delete().eq("id", deleting.id);
    setIsDeleting(false);
    if (delErr) {
      setDeleteError(`Cannot delete "${deleting.name}": ${delErr.message}`);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <PageContainer>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-text">Inventory</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "All"],
            ["menu", "Menu items"],
            ["preorder", "Pre-order items"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={
                "rounded-full border px-4 py-1.5 text-sm " +
                (tab === v
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-surface text-text-muted hover:bg-bg-muted")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-auto">
          <Select 
            value={filterCampus} 
            onChange={(e) => setFilterCampus(e.target.value)}
            className="w-full sm:w-48 bg-surface border-border text-sm"
          >
            <option value="all">All Campuses</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      {error && !open && (
        <p className="mb-4 rounded-xl bg-error/10 p-3 text-sm text-error">{error}</p>
      )}

      {(() => {
        const shown = items.filter((i) => {
          const tabMatch = tab === "all" ? true : tab === "preorder" ? i.is_preorder : !i.is_preorder;
          const campusMatch = filterCampus === "all" ? true : i.campus_id === filterCampus;
          return tabMatch && campusMatch;
        });
        return shown.length === 0 ? (
          <p className="py-16 text-center text-text-faint">
            {tab === "preorder"
              ? "No pre-order items yet. Add an item and toggle “Pre-order item” on."
              : "No items yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map((item) => (
            <Card key={item.id}>
              <CardBody className="flex items-center gap-3 p-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg-muted text-xl">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "🍽️"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-text">
                    {item.name}
                    <Badge tone="neutral">{campuses.find((c) => c.id === item.campus_id)?.name ?? "Global"}</Badge>
                    {item.is_preorder && <Badge tone="primary">Pre-order</Badge>}
                    {!item.is_available && <Badge tone="error">Hidden</Badge>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="font-bold text-primary">{money(item.price)}</span>
                    <StockCell item={item} />
                  </div>
                </div>
                <button onClick={() => toggle(item)} title="Toggle visibility" className="p-2 text-text-muted">
                  {item.is_available ? <Eye className="h-5 w-5 text-success" /> : <EyeOff className="h-5 w-5" />}
                </button>
                <button onClick={() => openEdit(item)} className="p-2 text-primary">
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => confirmDelete(item)}
                  className="p-1.5 text-error hover:bg-error/10 hover:text-error rounded-xl transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </CardBody>
            </Card>
          ))}
            </div>
          );
        })()}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit item" : "Add item"}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={save}>{editing ? "Update" : "Add"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="flex h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-text-faint">+ Add photo</span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(f ? URL.createObjectURL(f) : preview);
              }}
            />
          </label>
          <div>
            <Label>Name</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <Input inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <div>
            <Label>Delivery Fee</Label>
            <Input inputMode="numeric" value={draft.delivery_fee} onChange={(e) => setDraft({ ...draft, delivery_fee: e.target.value })} />
          </div>
          <div className="grid grid-cols-1">
            <div>
              <Label>Category</Label>
              <Input 
                value={draft.category} 
                onChange={(e) => setDraft({ ...draft, category: e.target.value })} 
                list="category-suggestions"
                placeholder="e.g. Snacks, or type a new category"
              />
              <datalist id="category-suggestions">
                {Array.from(new Set([...CATEGORIES, ...items.map(i => i.category)])).sort().map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Campus (Select multiple)</Label>
              <div className="flex flex-col gap-2 mt-2">
                {campuses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm text-text">
                    <input
                      type="checkbox"
                      checked={draft.campus_ids.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDraft({ ...draft, campus_ids: [...draft.campus_ids, c.id] });
                        } else {
                          setDraft({ ...draft, campus_ids: draft.campus_ids.filter((id) => id !== c.id) });
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-surface"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Restaurant (optional)</Label>
              <Select value={draft.restaurant_id} onChange={(e) => setDraft({ ...draft, restaurant_id: e.target.value })}>
                <option value="">None (In-house)</option>
                {restaurants.filter(r => draft.campus_ids.includes(r.campus_id) || draft.campus_ids.length === 0).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1">
            <div>
              <Label>Expected arrival (optional)</Label>
              <Input
                placeholder="e.g. 9:30 PM"
                value={draft.expected_arrival}
                onChange={(e) => setDraft({ ...draft, expected_arrival: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Custom instruction (for rider)</Label>
            <Textarea
              value={draft.custom_instruction}
              onChange={(e) => setDraft({ ...draft, custom_instruction: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text">Available to customers</span>
            <Switch checked={draft.is_available} onChange={(v) => setDraft({ ...draft, is_available: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-text">Pre-order item</span>
              <p className="text-xs text-text-faint">Shown on the pre-order page (no stock needed)</p>
            </div>
            <Switch checked={draft.is_preorder} onChange={(v) => setDraft({ ...draft, is_preorder: v })} />
          </div>
          {error && <p className="text-sm text-error mt-4">{error}</p>}
        </div>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => !isDeleting && setDeleting(null)}
        title="Delete Item"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" loading={isDeleting} onClick={executeDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Are you sure you want to delete &quot;{deleting?.name}&quot;?
        </p>
        {deleteError && <p className="text-sm text-error mt-4">{deleteError}</p>}
      </Modal>
    </PageContainer>
  );
}

/** Inline stock editor — update stock in one click, no dialog / no reupload. */
function StockCell({ item }: { item: Item }) {
  const router = useRouter();
  const [stock, setStock] = useState(item.stock_quantity);
  const [savedStock, setSavedStock] = useState(item.stock_quantity);
  const [saving, setSaving] = useState(false);

  async function persist(v: number) {
    const nv = Math.max(0, Math.floor(v || 0));
    setStock(nv);
    setSaving(true);
    await createClient().from("items").update({ stock_quantity: nv }).eq("id", item.id);
    setSaving(false);
    setSavedStock(nv);
    router.refresh();
  }

  const isDirty = stock !== savedStock;

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-text-muted">Stock</span>
      <button
        onClick={() => persist(stock - 1)}
        className="grid h-6 w-6 place-items-center rounded-md border border-border text-primary hover:bg-bg-muted"
        aria-label="Decrease stock"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        value={stock}
        inputMode="numeric"
        onChange={(e) => setStock(Number(e.target.value.replace(/\D/g, "")) || 0)}
        onKeyDown={(e) => {
          if (e.key === "Enter") persist(stock);
        }}
        className={`h-6 w-12 rounded-md border border-border bg-surface text-center text-sm ${
          stock <= 5 ? "text-error" : "text-text"
        }`}
      />
      <button
        onClick={() => persist(stock + 1)}
        className="grid h-6 w-6 place-items-center rounded-md border border-border text-primary hover:bg-bg-muted"
        aria-label="Increase stock"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      {isDirty && !saving && (
        <button
          onClick={() => persist(stock)}
          className="ml-1 grid h-6 w-6 place-items-center rounded-md bg-success/10 text-success hover:bg-success/20"
          title="Save stock value"
        >
          <Check className="h-4 w-4 stroke-[3]" />
        </button>
      )}
      {saving && (
        <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  );
}
