"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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
  expected_arrival: string;
  is_preorder: boolean;
};

const empty: Draft = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  delivery_fee: "0",
  category: "Snacks",
  custom_instruction: "",
  is_available: true,
  restaurant_id: "",
  expected_arrival: "",
  is_preorder: false,
};

export function InventoryManager({
  items,
  restaurants,
  campusId,
}: {
  items: Item[];
  restaurants: Restaurant[];
  campusId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        campus_id: campusId,
        restaurant_id: draft.restaurant_id || null,
        expected_arrival: draft.expected_arrival.trim() || null,
        is_preorder: draft.is_preorder,
      };
      const { error } = editing
        ? await supabase.from("items").update(payload).eq("id", editing.id)
        : await supabase.from("items").insert(payload);
      if (error) throw error;
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
  async function del(item: Item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await createClient().from("items").delete().eq("id", item.id);
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

      {items.length === 0 ? (
        <p className="py-16 text-center text-text-faint">No items yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
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
                  <p className="flex items-center gap-2 font-semibold text-text">
                    {item.name}
                    {!item.is_available && <Badge tone="error">Hidden</Badge>}
                  </p>
                  <p className="text-sm">
                    <span className="font-bold text-primary">{money(item.price)}</span>
                    <span className={`ml-3 ${item.stock_quantity <= 5 ? "text-error" : "text-text-muted"}`}>
                      Stock: {item.stock_quantity}
                    </span>
                  </p>
                </div>
                <button onClick={() => toggle(item)} title="Toggle visibility" className="p-2 text-text-muted">
                  {item.is_available ? <Eye className="h-5 w-5 text-success" /> : <EyeOff className="h-5 w-5" />}
                </button>
                <button onClick={() => openEdit(item)} className="p-2 text-primary">
                  <Pencil className="h-5 w-5" />
                </button>
                <button onClick={() => del(item)} className="p-2 text-error">
                  <Trash2 className="h-5 w-5" />
                </button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price</Label>
              <Input inputMode="numeric" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
            </div>
            <div>
              <Label>Stock</Label>
              <Input inputMode="numeric" value={draft.stock_quantity} onChange={(e) => setDraft({ ...draft, stock_quantity: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delivery fee</Label>
              <Input inputMode="numeric" value={draft.delivery_fee} onChange={(e) => setDraft({ ...draft, delivery_fee: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Restaurant</Label>
              <Select
                value={draft.restaurant_id}
                onChange={(e) => setDraft({ ...draft, restaurant_id: e.target.value })}
              >
                <option value="">None</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Expected arrival</Label>
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
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      </Modal>
    </PageContainer>
  );
}
