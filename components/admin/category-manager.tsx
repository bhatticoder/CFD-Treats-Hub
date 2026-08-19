"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { ItemCategory } from "@/lib/types/models";

export function CategoryManager({
  campusId,
  categories,
}: {
  campusId: string;
  categories: ItemCategory[];
}) {
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("item_categories")
      .insert({ campus_id: campusId, name: newCategory.trim() });
    
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      setNewCategory("");
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("item_categories").delete().eq("id", id);
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      router.refresh();
    }
  }

  return (
    <PageContainer>
      <h1 className="mb-4 text-2xl font-extrabold text-text">Categories</h1>
      
      <Card className="mb-6">
        <CardBody>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>New Category Name</Label>
              <Input
                placeholder="e.g. Snacks, Drinks, Mains"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={50}
              />
            </div>
            <Button type="submit" loading={busy} disabled={!newCategory.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {categories.length === 0 ? (
          <p className="col-span-full py-8 text-center text-text-faint">
            No categories added yet. Add one above.
          </p>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id}>
              <CardBody className="flex items-center justify-between p-4">
                <span className="font-semibold text-text">{cat.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-error hover:bg-error/10 hover:text-error"
                  onClick={() => handleDelete(cat.id)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
