"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { PageContainer } from "@/components/app-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/misc";
import type { Campus, Voucher } from "@/lib/types/models";

export function AdminVouchers({ campuses, vouchers }: { campuses: Campus[]; vouchers: Voucher[] }) {
  const router = useRouter();
  const [selectedCampusId, setSelectedCampusId] = useState<string>(campuses[0]?.id ?? "");
  const activeVouchers = vouchers.filter((v) => v.campus_id === selectedCampusId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"percentage" | "fixed">("percentage");
  const [newValue, setNewValue] = useState("");
  const [newMin, setNewMin] = useState("0");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createVoucher() {
    setError(null);
    if (!newCode.trim() || !newValue || isNaN(Number(newValue)) || Number(newValue) <= 0) {
      setError("Please fill in all fields correctly.");
      return;
    }

    setIsCreating(true);
    const { error: insertErr } = await createClient().from("vouchers").insert({
      campus_id: selectedCampusId,
      code: newCode.trim().toUpperCase(),
      discount_type: newType,
      discount_value: Number(newValue),
      min_order_value: Number(newMin) || 0,
    });
    setIsCreating(false);

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setCreateOpen(false);
      setNewCode("");
      setNewValue("");
      setNewMin("0");
      router.refresh();
    }
  }

  async function toggleVoucher(id: string, isActive: boolean) {
    await createClient().from("vouchers").update({ is_active: isActive }).eq("id", id);
    router.refresh();
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Are you sure you want to delete this voucher?")) return;
    await createClient().from("vouchers").delete().eq("id", id);
    router.refresh();
  }

  return (
    <PageContainer max="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-text">Discount Vouchers</h1>
        <div className="flex items-center gap-3">
          <Label className="whitespace-nowrap">Campus:</Label>
          <Select
            value={selectedCampusId}
            onChange={(e) => setSelectedCampusId(e.target.value)}
            className="w-48"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Voucher
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {activeVouchers.length === 0 ? (
          <p className="text-text-muted col-span-2 py-4">No vouchers found for this campus.</p>
        ) : (
          activeVouchers.map((voucher) => (
            <Card key={voucher.id}>
              <CardBody className="flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-primary">{voucher.code}</h3>
                    <p className="text-sm font-medium text-text">
                      {voucher.discount_type === "percentage"
                        ? `${voucher.discount_value}% OFF`
                        : `${money(voucher.discount_value)} OFF`}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      Min Order: {money(voucher.min_order_value)}
                    </p>
                  </div>
                  <Switch
                    checked={voucher.is_active}
                    onChange={(v) => toggleVoucher(voucher.id, v)}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1 text-xs">
                    {voucher.is_active ? (
                      <><CheckCircle2 className="h-4 w-4 text-success" /> Active</>
                    ) : (
                      <><XCircle className="h-4 w-4 text-text-muted" /> Inactive</>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-error hover:bg-error/10 hover:text-error"
                    onClick={() => deleteVoucher(voucher.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Discount Voucher"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createVoucher} loading={isCreating}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-sm text-error">{error}</div>}
          <div>
            <Label>Voucher Code</Label>
            <Input
              placeholder="e.g. WELCOME10"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discount Type</Label>
              <Select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "percentage" | "fixed")}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (Rs.)</option>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Minimum Order Value</Label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 500"
              value={newMin}
              onChange={(e) => setNewMin(e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">Set to 0 if no minimum is required.</p>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
